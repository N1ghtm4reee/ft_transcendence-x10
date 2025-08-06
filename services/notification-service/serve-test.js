#!/usr/bin/env node
/**
 * Simple HTTP server to serve the notification test UI
 * Run with: node serve-test.js
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8081;

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  let filePath = "." + req.url;
  if (filePath === "./") {
    filePath = "./test-notifications.html";
  }

  const extname = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
  };

  const contentType = mimeTypes[extname] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404);
        res.end("File not found");
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Test UI server running at http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${__dirname}`);
  console.log(`🔔 Make sure notification service is running on port 3005`);
  console.log(`\n📖 How to test:`);
  console.log(`1. Start the notification service: npm start`);
  console.log(`2. Open http://localhost:${PORT} in your browser`);
  console.log(`3. Both users will auto-connect to WebSocket`);
  console.log(`4. Send messages between Alice and Bob`);
  console.log(`5. Watch real-time notifications appear!`);
});
