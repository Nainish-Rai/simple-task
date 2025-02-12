// @ts-ignore
import { MongoClient, ObjectId } from "mongodb";
// @ts-ignore
import { faker } from "@faker-js/faker";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI environment variable is not set");
}

const client = new MongoClient(uri);

// Utility functions for generating data
const generateUser = () => ({
  _id: new ObjectId(),
  created_time: new Date(),
  email: faker.internet.email(),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  gender: faker.helpers.arrayElement(["male", "female", "other"]),
  profile_image_url: faker.image.avatar(),
  user_id: faker.string.uuid(),
  subscription: faker.helpers.arrayElement(["free", "premium", null]),
});

const generateCalendarAccount = (userId: ObjectId) => ({
  _id: new ObjectId(),
  userId: userId,
  provider: faker.helpers.arrayElement(["google", "outlook"]),
  accountEmail: faker.internet.email(),
  accessToken: faker.string.alphanumeric(64),
  refreshToken: faker.string.alphanumeric(64),
  expiry: faker.date.future(),
  calendarIds: [faker.string.uuid(), faker.string.uuid()],
  isPrimary: faker.datatype.boolean(),
  lastSynced: faker.date.recent(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

const generateCalendarEvent = (userId: ObjectId) => {
  const startTime = faker.date.future();
  const endTime = new Date(
    startTime.getTime() + faker.number.int({ min: 1800000, max: 7200000 })
  ); // 30min to 2hrs

  return {
    _id: new ObjectId(),
    userId: userId,
    title: faker.helpers.arrayElement([
      "Team Meeting",
      "Client Call",
      "Project Review",
      "Lunch Break",
      "Doctor Appointment",
      "Birthday Party",
    ]),
    description: faker.lorem.sentence(),
    startTime,
    endTime,
    location: faker.helpers.maybe(() => faker.location.streetAddress(), {
      probability: 0.7,
    }),
    status: faker.helpers.arrayElement(["confirmed", "tentative", "cancelled"]),
    isAllDay: faker.helpers.maybe(() => true, { probability: 0.2 }),
    recurrence: faker.helpers.maybe(
      () => ({
        frequency: faker.helpers.arrayElement(["daily", "weekly", "monthly"]),
        interval: faker.number.int({ min: 1, max: 4 }),
        until: faker.date.future(),
      }),
      { probability: 0.3 }
    ),
    externalIds: faker.helpers.maybe(
      () => ({
        google: faker.string.uuid(),
        outlook: faker.string.uuid(),
      }),
      { probability: 0.5 }
    ),
    attendees: faker.helpers.maybe(
      () =>
        Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
          email: faker.internet.email(),
          status: faker.helpers.arrayElement([
            "accepted",
            "pending",
            "declined",
          ]),
        })),
      { probability: 0.6 }
    ),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

const generateReminder = (eventId: ObjectId) => ({
  _id: new ObjectId(),
  eventId: eventId,
  reminderType: faker.helpers.arrayElement(["email", "push", "both"]),
  minutesBefore: faker.helpers.arrayElement([5, 10, 15, 30, 60, 1440]), // including 24hrs (1440 min)
  status: faker.helpers.arrayElement(["pending", "sent", "failed"]),
  createdAt: new Date(),
});

const generateAvailability = (userId: ObjectId) => {
  const startHour = faker.number.int({ min: 7, max: 11 });
  const endHour = faker.number.int({ min: 16, max: 20 });

  return {
    _id: new ObjectId(),
    userId: userId,
    dayOfWeek: faker.number.int({ min: 0, max: 6 }),
    startTime: `${startHour.toString().padStart(2, "0")}:00`,
    endTime: `${endHour.toString().padStart(2, "0")}:00`,
    isAvailable: faker.datatype.boolean(0.8), // 80% chance of being available
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

async function main() {
  try {
    await client.connect();
    const db = client.db();
    console.log("🌱 Starting seeding...");

    // Clear existing data
    console.log("Clearing existing data...");
    await db.collection("reminder").deleteMany({});
    await db.collection("calendarEvent").deleteMany({});
    await db.collection("calendarAccount").deleteMany({});
    await db.collection("availability").deleteMany({});
    await db.collection("user").deleteMany({});

    console.log("Creating new data...");

    // Create users
    const users = Array.from({ length: 5 }, generateUser);
    await db.collection("user").insertMany(users);
    console.log(`✅ Created ${users.length} users`);

    // Create calendar accounts
    const calendarAccounts = users.flatMap((user) =>
      Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () =>
        generateCalendarAccount(user._id)
      )
    );
    await db.collection("calendarAccount").insertMany(calendarAccounts);
    console.log("✅ Created calendar accounts");

    // Create availability settings
    const availabilitySettings = users.flatMap((user) =>
      Array.from({ length: 7 }, (_, i) => {
        const availability = generateAvailability(user._id);
        availability.dayOfWeek = i;
        return availability;
      })
    );
    await db.collection("availability").insertMany(availabilitySettings);
    console.log("✅ Created availability settings");

    // Create calendar events and reminders
    for (const user of users) {
      const events = Array.from({ length: 20 }, () =>
        generateCalendarEvent(user._id)
      );
      await db.collection("calendarEvent").insertMany(events);

      const reminders = events.flatMap((event) =>
        Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () =>
          generateReminder(event._id)
        )
      );
      if (reminders.length > 0) {
        await db.collection("reminder").insertMany(reminders);
      }
    }
    console.log("✅ Created calendar events and reminders");

    console.log("🌱 Seeding completed!");
  } catch (error) {
    console.error("Error while seeding:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
