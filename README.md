# Website Project (Cloud Run)

This is the tauchoportal frontend service deployed to Google Cloud Run?

## Quick Start - Development

### Debug with F5
1. Open VS Code at the workspace root
2. Press **F5** to start the debugger
3. Open http://localhost:8080 in your browser

The server will start on port 8080 and serve HTML pages from `public/` directory.

### Pages
- **Home**: http://localhost:8080/ (index.html)
- **About**: http://localhost:8080/about (about.html)

See [DEBUGGING.md](./DEBUGGING.md) for detailed debugging tips.

### Local Development (without debugger)
```bash
# From the website/ directory
go run ./cmd

# Or build
go build -o ./bin/website ./cmd
```

### Edit & Refresh
1. Edit HTML files in `public/` folder
2. Save the file
3. Refresh your browser (F5 or Ctrl+R)

No server restart needed for HTML changes!

## Project Structure

```
website/
├── cmd/
│   └── main.go              # Go server
├── public/
│   ├── index.html           # Landing page
│   └── about.html           # About page
├── Dockerfile               # Container build
├── cloudbuild.yaml          # Cloud Build config
└── README.md                # This file
```

## Build Docker Image
```bash
# From root directory
docker build -t tauchoportal:latest -f website/Dockerfile .
```

## Environment Variables
- `PORT`: Server port (default: 8080)
- `GOOGLE_CLOUD_PROJECT`: GCP project ID (optional)

## Deploy to Cloud Run
```bash
gcloud run deploy tauchoportal \
  --image gcr.io/PROJECT-ID/tauchoportal:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --platform managed
```

Or use Cloud Build:
```bash
gcloud builds submit --config=website/cloudbuild.yaml
```

## Routes & Endpoints
- `GET /` - Home page (index.html)
- `GET /about` - About page (about.html)
- `GET /health` - Health check (JSON)
- `GET /api/version` - Version info (JSON)
