import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import type { RegisterDto, LoginDto } from './dto'

@Injectable()
export class AuthService {
  constructor(
    @Inject('DB') private db: any,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1)

    if (existing.length > 0) {
      throw new ConflictException('Email already registered')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const [user] = await this.db
      .insert(users)
      .values({
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role as any || 'analyst',
      })
      .returning()

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    })

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    }
  }

  async login(dto: LoginDto) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1)

    if (!user) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    })

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    }
  }

  async getMe(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) throw new UnauthorizedException()

    return { id: user.id, name: user.name, email: user.email, role: user.role }
  }
}