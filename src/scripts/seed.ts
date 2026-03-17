/* eslint-disable no-console */
import { DataSource } from 'typeorm'
import { User } from '../facebook/auth/entity/user.entity'
import * as bcrypt from 'bcrypt'
import * as dotenv from 'dotenv'

dotenv.config()

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'campaign_metrics',
    entities: [User],
    synchronize: true,
  })

  await dataSource.initialize()

  const userRepository = dataSource.getRepository(User)

  const existingUser = await userRepository.findOne({ where: { username: 'admin' } })

  if (existingUser) {
    console.log('User admin already exists.')
    await dataSource.destroy()
    return
  }

  const hashedPassword = await bcrypt.hash('Admin123!', 10)

  const newUser = userRepository.create({
    username: 'admin',
    email: 'admin@exemplo.com',
    password: hashedPassword,
  })

  await userRepository.save(newUser)

  console.log('Seed success: Admin user created (Pass: Admin123!)')
  await dataSource.destroy()
}

seed().catch((err) => {
  console.error('Error seeding data:', err)
  process.exit(1)
})
