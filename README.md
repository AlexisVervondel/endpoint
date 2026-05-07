# CluePoints Visitor Register

Touch-optimised visitor registration kiosk for CluePoints reception.

## Local Development

```bash
cp .env.example .env
# Fill in Azure AD credentials
npm install
npm run dev
```

- Kiosk: http://localhost:5173/kiosk  
- Admin: http://localhost:5173/admin

## Azure AD App Registration

1. Create an App Registration in Azure Active Directory
2. Under **API permissions**, add:
   - `User.Read.All` (Application)
   - `Mail.Send` (Application)
3. Grant admin consent
4. Create a **Client Secret** and note the value
5. Fill in `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` in your `.env`

## Azure App Service Deployment

```bash
# Build and push Docker image
docker build -t clue-register .
docker tag clue-register <acr>.azurecr.io/clue-register:latest
docker push <acr>.azurecr.io/clue-register:latest
```

Set the following App Service environment variables:
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `GRAPH_SERVICE_ACCOUNT`
- `DB_PATH` → `/home/visitors.db` (persists across restarts)
- `NODE_ENV` → `production`
- `PORT` → `3000`

## Environment Variables

| Variable | Description |
|---|---|
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_CLIENT_SECRET` | App registration client secret |
| `GRAPH_SERVICE_ACCOUNT` | Mailbox for sending reminders (e.g. `noreply@cluepoints.com`) |
| `DB_PATH` | SQLite file path (default: `./visitors.db`) |
| `PORT` | Server port (default: `3000`) |
| `NODE_ENV` | `development` or `production` |
