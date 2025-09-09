import { WebSocketServer } from 'ws'
import { prismaClient } from 'db/client'

const wss = new WebSocketServer({ port: 8081 })


wss.on('connection', (ws) => {
  ws.on('message', async(message) => {
    const text = message.toString()
      const data = await prismaClient.user.create({
                data: {
                    username: Math.random().toString(),
                    password: Math.random().toString()
                }
      })
    console.log(data);
    
            ws.send(text);
  })
})