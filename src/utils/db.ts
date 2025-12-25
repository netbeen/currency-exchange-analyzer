import './config';
import { PrismaClient } from '../generated/client/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const url = process.env.DATABASE_URL;

if (!url) {
    console.error('错误: 未定义 DATABASE_URL 环境变量');
    process.exit(1);
}

const adapter = new PrismaLibSql({
    url: url,
});

export const prisma = new PrismaClient({ adapter });
