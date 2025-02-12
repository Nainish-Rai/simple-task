import { PrismaClient } from "@prisma/client";
import { userCreateProps } from "@/utils/types";

const prisma = new PrismaClient();

export const userCreate = async ({
  email,
  first_name,
  last_name,
  profile_image_url,
  user_id,
}: userCreateProps) => {
  try {
    const user = await prisma.user.create({
      data: {
        email,
        first_name,
        last_name,
        profile_image_url,
        user_id,
      },
    });

    return user;
  } catch (error: any) {
    throw new Error(error.message);
  } finally {
    await prisma.$disconnect();
  }
};
