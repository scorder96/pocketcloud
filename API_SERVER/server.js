import express from "express";
import { exec } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { fileURLToPath } from 'url';
import { dirname, join, basename } from "path";
import multer, { diskStorage } from "multer";
import PocketBase from "pocketbase";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
import cors from "cors";
const PORT = 9000;

app.use(cors());
const pb = new PocketBase(process.env.SUPER_DATABASE_URL);
pb.admins.authWithPassword(process.env.ADMIN_USER,process.env.ADMIN_PWD)

app.get("/deploy/:id", (req, res) => {
  pb.collection('instances').getFirstListItem('instance="'+req.params.id+'"')
    .then(() => {
      const deploy = exec(
        "docker run -d --name " + req.params.id + " --network mynet database-spinup"
      );
      deploy.stdout.on("data", (data) => {
        console.log(data.toString());
      });
      deploy.stdout.on("error", (data) => {
        console.log(data.toString());
      });
      deploy.stdout.on("close", () => {
        console.log("Deployed!");
        res.sendStatus(200);
      });
    })
    .catch(() => res.sendStatus(401));
});

app.get("/pause/:id", (req, res) => {
  pb.collection('instances').getFirstListItem('instance="'+req.params.id+'"')
    .then((response) => {
      if (response.power==false) {
        const stop = exec("docker stop " + req.params.id);
  
        stop.stdout.on("data", (data) => {
          console.log(data.toString());
        });
        stop.stdout.on("error", (data) => {
          console.log(data.toString());
        });
        stop.stdout.on("close", () => {
          console.log("Paused!");
          res.sendStatus(200);
        });
      }
      else{
        res.sendStatus(401)
      }
    })
    .catch(() => res.sendStatus(401));
});

app.get("/unpause/:id", (req, res) => {
  pb.collection('instances').getFirstListItem('instance="'+req.params.id+'"')
    .then((response) => {
      if (response.power==true) {
        const start = exec("docker start " + req.params.id);
        start.stdout.on("data", (data) => {
          console.log(data.toString());
        });
        start.stdout.on("error", (data) => {
          console.log(data.toString());
        });
        start.stdout.on("close", () => {
          console.log("Unpaused!");
          res.sendStatus(200);
        });
      }
      else{
        res.sendStatus(401)
      }
    })
    .catch(() => res.sendStatus(401));
});

app.get("/delete/:id", (req, res) => {
  pb.collection('instances').getFirstListItem('instance="'+req.params.id+'"')
    .then(() => res.sendStatus(401))
    .catch(() => {
      const stop = exec("docker stop " + req.params.id);

      stop.stdout.on("data", (data) => {
        console.log(data.toString());
      });
      stop.stdout.on("error", (data) => {
        console.log(data.toString());
      });
      stop.stdout.on("close", () => {
        console.log("Paused, removing!");
        const remove = exec("docker rm " + req.params.id);

        remove.stdout.on("data", (data) => {
          console.log(data.toString());
        });
        remove.stdout.on("error", (data) => {
          console.log(data.toString());
        });
        remove.stdout.on("close", () => {
          console.log("Removed!");
          res.sendStatus(200);
        });
      })
    })
});

app.post("/data/:id", (req, res) => {
  if (!existsSync("data/" + req.params.id)) {
    mkdirSync("data/" + req.params.id);
  }

  const storage = diskStorage({
    destination: (req, file, cb) => {
      const originalPath = dirname(file.originalname);
      const relativePath = originalPath.split("/").slice(1).join("/");
      const uploadPath = join(__dirname, "data", req.params.id, relativePath);
      mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath); // Specify the folder where you want to store the files
    },
    filename: (req, file, cb) => {
      cb(null, basename(file.originalname)); // Filename
    },
  });

  const upload = multer({ storage: storage, preservePath: true }).array("files");

  upload(req, res, (err) => {
    if (err) {
      return res.status(500).send("Error uploading files.");
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No files were uploaded.");
    }

    const command = `docker exec ${req.params.id} rm -rf /pb/pb_data && docker exec ${req.params.id} mkdir -p /pb/pb_data && docker cp data/${req.params.id}/. ${req.params.id}:/pb/pb_data && rm -rf data/${req.params.id}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      console.log("Directory '/pb/pb_data' has been uploaded successfully!");
    });
    // fs.rm('uploads/'+req.params.id, { recursive: true, force: true },(err)=>{console.log(err)});

    res.status(200).send("Files uploaded and copied to the container successfully.");
  });
});

app.post("/hooks/:id", (req, res) => {
  if (!existsSync("hooks/" + req.params.id)) {
    mkdirSync("hooks/" + req.params.id);
  }

  const storage = diskStorage({
    destination: (req, file, cb) => {
      const originalPath = dirname(file.originalname);
      const relativePath = originalPath.split("/").slice(1).join("/");
      const uploadPath = join(__dirname, "hooks", req.params.id, relativePath);
      mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath); // Specify the folder where you want to store the files
    },
    filename: (req, file, cb) => {
      cb(null, basename(file.originalname)); // Filename
    },
  });

  const upload = multer({ storage: storage, preservePath: true }).array("files");

  upload(req, res, (err) => {
    if (err) {
      return res.status(500).send("Error uploading files.");
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No files were uploaded.");
    }

    const command = `docker exec ${req.params.id} rm -rf /pb/pb_hooks && docker exec ${req.params.id} mkdir -p /pb/pb_hooks && docker cp hooks/${req.params.id}/. ${req.params.id}:/pb/pb_hooks && rm -rf hooks/${req.params.id}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      console.log("Directory '/pb/pb_hooks' has been uploaded successfully!");
    });
    // fs.rm('uploads/'+req.params.id, { recursive: true, force: true },(err)=>{console.log(err)});

    res.status(200).send("Files uploaded and copied to the container successfully.");
  });
});

app.post("/public/:id", (req, res) => {
  if (!existsSync("public/" + req.params.id)) {
    mkdirSync("public/" + req.params.id);
  }

  const storage = diskStorage({
    destination: (req, file, cb) => {
      const originalPath = dirname(file.originalname);
      const relativePath = originalPath.split("/").slice(1).join("/");
      const uploadPath = join(__dirname, "public", req.params.id, relativePath);
      mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath); // Specify the folder where you want to store the files
    },
    filename: (req, file, cb) => {
      cb(null, basename(file.originalname)); // Filename
    },
  });

  const upload = multer({ storage: storage, preservePath: true }).array("files");

  upload(req, res, (err) => {
    if (err) {
      return res.status(500).send("Error uploading files.");
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No files were uploaded.");
    }

    const command = `docker exec ${req.params.id} rm -rf /pb/pb_public && docker exec ${req.params.id} mkdir -p /pb/pb_public && docker cp public/${req.params.id}/. ${req.params.id}:/pb/pb_public && rm -rf public/${req.params.id}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      console.log("Directory '/pb/pb_public' has been uploaded successfully!");
    });
    // fs.rm('uploads/'+req.params.id, { recursive: true, force: true },(err)=>{console.log(err)});

    res.status(200).send("Files uploaded and copied to the container successfully.");
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Deploy server running on " + PORT);
});
