import express, { Request, Response } from 'express'
import dotenv from 'dotenv'

dotenv.config()
const port = process.env.PORT ?? 6001

const app = express()

app.get('/', (req: Request, res: Response) => {
  res.status(200).json('Hello')
})

app.listen(port, () => {
  console.log(`Application started on port ${port}`);
})