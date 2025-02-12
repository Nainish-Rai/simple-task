import { PrismaClient } from "@prisma/client";
import { userUpdateProps } from "@/utils/types";

const prisma = new PrismaClient();

export const userUpdate = async ({
  email,
  first_name,
  last_name,
  profile_image_url,
  user_id,
}: userUpdateProps) => {
  try {
    const user = await prisma.user.update({
      where: {
        email: email,
      },
      data: {
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
