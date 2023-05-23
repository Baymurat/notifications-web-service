import express, { Request, Response } from "express"
import dotenv from 'dotenv'
import { WebSocketServer, type WebSocket } from 'ws'
import uuid from 'node-uuid'
import http from 'http'

const whatsAppClient = require("@green-api/whatsapp-api-client")

interface IClient {
  idInstance: string
  id: string
  ws: WebSocket
}

dotenv.config()

const port = process.env.PORT ?? 6001
const webhookUrl = process.env.WEB_HOOK_URL

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients: IClient[] = [];

app.use(express.json());
app.get('/', (req: Request, res: Response) => {
  res.status(200).json('Hello World!')
});

const main = async () => {
  wss.on('connection', (ws) => {
    const clientId = uuid.v4()

    ws.addEventListener('message', async ({ data }) => {
      const { command, idInstance, apiTokenInstance } = JSON.parse(data as string)
      console.log(command, idInstance, apiTokenInstance);

      if (command === 'init') {
        try {
          const response = await fetch(
            `https://api.green-api.com/waInstance${idInstance}/SetSettings/${apiTokenInstance}`,
            {
              method: 'POST',
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ webhookUrl })
            }
          )

          const body = await response.json()
          if (body.saveSettings) {
            clients.push({ idInstance, ws, id: clientId })
          }
        } catch (err) {
          console.error(err)
        }
      }
    })

    ws.on('close', () => {
      const clientIndex = clients.findIndex((client) => client.id === clientId)
      if (clientIndex !== -1) {
        clients.splice(clientIndex, 1)
      }
    })
  });

  // Receive webhook
  try {
    const webHookAPI = whatsAppClient.webhookAPI(app, '/green-api/webhook')

    webHookAPI.onIncomingMessageText((data: any, idInstance: any, idMessage: any, sender: any, typeMessage: any, textMessage: any) => {
      const client = clients.find((client) => Number(client.idInstance) === idInstance)
      if (client != null) {
        client.ws.send(JSON.stringify(data))
      }
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  server.listen(port, () => {
    console.log(`Application started on port ${port}`);
  })
}

main()