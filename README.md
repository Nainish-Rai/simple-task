# SimpleTask Application

## MongoDB Setup

1. Create a MongoDB Atlas account or use a local MongoDB installation
2. Get your MongoDB connection string
3. Create a `.env` file in the root directory and add your MongoDB URI:

```bash
MONGODB_URI=your_mongodb_connection_string
```

4. Run the following commands to initialize the database:

```bash
npx prisma generate
npx prisma db push
```

## Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## API Testing

Test the MongoDB connection using the following endpoints:

- GET `/api/users` - Retrieve all users
- POST `/api/users` - Create a new user

Example POST request:

```json
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "user_id": "user123"
}
```
