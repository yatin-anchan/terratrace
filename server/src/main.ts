import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://terratrace-j9np6x99f-yatin-anchans-projects.vercel.app',
      /\.vercel\.app$/,
    ],
    credentials: true,
  })

  await app.listen(process.env.PORT || 3000)
  console.log('TerraTrace API running')
}

bootstrap()