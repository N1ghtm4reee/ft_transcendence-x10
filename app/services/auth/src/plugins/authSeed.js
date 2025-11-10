import { PrismaClient } from '@prisma/client';
// import bcrypt from 'bcrypt';
// import fetch from 'node-fetch'; // remove if Node >= 18

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding auth database...");
  
  // Define our two specific users
  const users = [
    {
      name: 'aakhrif',
      email: 'aakhrif@gmail.com',
      bio: 'Ready to dominate the game! 🎮'
    },
    {
      name: 'baarif',
      email: 'baarif@gmail.com', 
      bio: 'Let\'s see who\'s the real champion! 🏆'
    }
  ];

  for (const userData of users) {
    const { name, email, bio } = userData;
    const password = email; // ⚠️ testing only
    
    // const salt = await bcrypt.genSalt(10);
    // const hash = await bcrypt.hash(password, salt);
    const hash = password;

    // Create user in auth database
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hash,
      },
    });

    // Build userProfile for user-service
    const userProfile = {
      id: user.id,
      displayName: user.name,
      avatar: user.avatar || "assets/default.png",
      bio: bio,
    };

    try {
      const profileResponse = await fetch(
        "http://user-service:3002/api/user-management/profiles",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userProfile),
        }
      );

      if (!profileResponse.ok) {
        console.error(`❌ Failed to create profile for ${user.email}`);
        const errorText = await profileResponse.text();
        console.error(`Error details: ${errorText}`);
      } else {
        console.log(`✅ Created auth user: ${user.email} (${user.name})`);
      }
    } catch (err) {
      console.error(`Error calling user service for ${user.email}:`, err);
    }
  }

  console.log("🎮 Two gaming rivals have been created!");
  console.log("📧 Login credentials:");
  console.log("   aakhrif: aakhrif@gmail.com / aakhrif@gmail.com");
  console.log("   baarif: baarif@gmail.com / baarif@gmail.com");
}

main()
  .then(async () => {
    console.log("✅ Auth seeding completed successfully!");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Auth seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });