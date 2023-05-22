import express, { Request, Response } from "express"
import dotenv from 'dotenv'
import { WebSocketServer, type WebSocket } from 'ws'
import uuid from 'node-uuid'

const whatsAppClient = require("@green-api/whatsapp-api-client")

dotenv.config()
const port = process.env.PORT ?? 6001
const webhookUrl = process.env.WEBHOOK_URL

const app = express();
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.status(200).json('Hello World!')
})

const wss = new WebSocketServer({ port: 4444 })

interface IClient {
  idInstance: string
  id: string
  ws: WebSocket
}

const clients: IClient[] = []

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
})
  // Receive webhook
  ;
(async () => {
  try {
    const webHookAPI = whatsAppClient.webhookAPI(app, '/webhook')

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
})();

app.listen(port, () => {
  console.log(`Application started on port ${port}`);
})