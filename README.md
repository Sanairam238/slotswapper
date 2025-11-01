Features
User signup & login
Create slot
Mark slot as swappable
View slots from other users
Send swap request
Accept/reject swap request
Slots update in real-time without page refresh
Uses SQLite + Prisma

FOLDER STRUCTURE
slotswapper/
client/ -> React frontend
prisma/ -> Database schema & migrations
server.js -> Backend server
package.json

//Clone the Repository
git clone https://github.com/yourusername/slotswapper.git
cd slotswapper

//Install Dependencies
npm install

//Frontend
cd client
npm install

//Setup Environment
Create a .env file in the project root and add:

DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your_secret_key"

//Initialize Database
npx prisma migrate dev --name init

//Run Backend
node server.js

//Run Frontend
cd client
npm run dev
