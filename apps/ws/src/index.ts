import { WebSocketServer } from 'ws'
import { prismaClient } from 'db/client'

const wss = new WebSocketServer({ port: 8081 })

wss.on('connection', (ws) => {
  ws.on('message', async(message) => {
    try {
      const text = message.toString()
      const data = await prismaClient.user.create({
        data: {
          username: Math.random().toString(),
          password: Math.random().toString()
        }
      })
      console.log(data);
      
      ws.send(text);
    } catch (error) {
      console.error('Error:', error)
      ws.send('Error processing message')
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})