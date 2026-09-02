# ShaqoHub - Teacher-School Connection App

A mobile application that connects teachers and lecturers with schools and universities in Mogadishu, Somalia. Built with React Native (Expo) for cross-platform mobile development and Node.js/Express for the backend API.

## Features

### For Teachers & Lecturers
- **Profile Creation**: Create detailed professional profiles with education, experience, and qualifications
- **Job Browsing**: Search and filter job postings from schools and universities
- **Job Applications**: Apply to teaching positions with one click
- **Application Tracking**: Monitor application status in real-time

### For Schools & Universities
- **Institution Profiles**: Showcase school/university information, location, and contact details
- **Job Posting**: Create and manage job listings with detailed requirements
- **Application Management**: Review applications, accept/reject candidates
- **Subscription Plans**: Access premium features through Dahabshil payment integration

### User Roles
1. **School Teacher** - For primary and secondary school educators
2. **University Lecturer** - For higher education academic staff
3. **School** - For primary and secondary educational institutions
4. **University** - For higher education institutions

## Tech Stack

### Mobile App
- **React Native** with Expo
- **React Navigation** for navigation
- **Axios** for API calls
- **Expo Secure Store** for secure token storage
- **Expo Image Picker** for image uploads

### Backend API
- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Multer** for file uploads
- **Bcrypt** for password hashing

## Project Structure

```
ShaqoHub/
├── mobile/                 # React Native mobile app
│   ├── src/
│   │   ├── screens/      # Screen components
│   │   ├── constants/    # API constants
│   │   └── utils/        # API utilities
│   ├── App.js           # Main app component
│   ├── package.json
│   └── app.json
├── server/               # Backend API
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── uploads/         # Image upload directory
│   ├── index.js         # Server entry point
│   └── .env             # Environment variables
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Expo CLI
- Git

### Backend Setup

1. **Navigate to the server directory**
```bash
cd server
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file in the server directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/shaqohub
JWT_SECRET=your_jwt_secret_key_change_this_in_production
DAHABSHIL_API_KEY=your_dahabshil_api_key
DAHABSHIL_MERCHANT_ID=your_merchant_id
```

4. **Create uploads directory**
```bash
mkdir uploads
```

5. **Start the server**
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### Mobile App Setup

1. **Navigate to the mobile directory**
```bash
cd mobile
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the Expo development server**
```bash
npm start
```

4. **Run on device/emulator**
- For iOS: Press `i` in the terminal or use Expo Go app
- For Android: Press `a` in the terminal or use Expo Go app
- For web: Press `w` in the terminal

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile/school-teacher` - Update school teacher profile
- `PUT /api/profile/university-lecturer` - Update university lecturer profile
- `PUT /api/profile/school` - Update school profile
- `PUT /api/profile/university` - Update university profile

### Jobs
- `GET /api/jobs` - Get all jobs (with optional filters)
- `GET /api/jobs/:id` - Get single job details
- `POST /api/jobs` - Create new job posting
- `POST /api/jobs/:id/apply` - Apply for a job
- `GET /api/jobs/my/postings` - Get user's job postings
- `PUT /api/jobs/:jobId/applications/:applicantId` - Update application status

## Database Models

### User Model
```javascript
{
  email: String,
  password: String,
  role: Enum['school_teacher', 'university_lecturer', 'school', 'university'],
  profile: {
    // Teacher/Lecturer fields
    fullName: String,
    educationLevel: String,
    fieldOfStudy: String,
    graduationYear: Number,
    isCurrentStudent: Boolean,
    profilePicture: String,
    academicTitle: String,
    department: String,
    researchFields: [String],
    
    // School/University fields
    institutionName: String,
    city: String,
    district: String,
    neighborhood: String,
    schoolType: String,
    logo: String,
    numberOfBranches: Number,
    phoneNumber: String
  },
  subscription: {
    isActive: Boolean,
    plan: String,
    startDate: Date,
    endDate: Date,
    dahabshilTransactionId: String
  }
}
```

### Job Model
```javascript
{
  postedBy: ObjectId,
  institutionType: Enum['school', 'university'],
  title: String,
  description: String,
  teacherType: String,
  subjects: [String],
  salary: {
    amount: Number,
    currency: String,
    period: String
  },
  location: {
    district: String,
    village: String,
    city: String
  },
  requirements: [String],
  phoneNumber: String,
  applicationDeadline: Date,
  isActive: Boolean,
  applications: [{
    applicant: ObjectId,
    appliedAt: Date,
    status: Enum['pending', 'accepted', 'rejected']
  }]
}
```

## Payment Integration (Dahabshil)

The app integrates with Dahabshil for subscription payments. The payment flow:

1. User selects a subscription plan
2. App initiates payment through Dahabshil API
3. User completes payment on Dahabshil platform
4. Payment confirmation is received
5. User subscription is activated

**Note**: The current implementation includes a simulated payment flow. For production, integrate with the actual Dahabshil payment API using their merchant credentials.

## Deployment

### Backend Deployment

1. **Deploy to a cloud platform** (Heroku, DigitalOcean, AWS, etc.)
2. **Set up MongoDB Atlas** for cloud database
3. **Configure environment variables** in production
4. **Set up file storage** (AWS S3, Cloudinary) for image uploads

### Mobile App Deployment

#### For iOS
1. Build the app using Expo EAS Build
2. Submit to Apple App Store
3. Configure App Store Connect listing

#### For Android
1. Build the app using Expo EAS Build
2. Submit to Google Play Store
3. Configure Play Store listing

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Secure storage for tokens on mobile devices
- Input validation on all API endpoints
- File upload restrictions (type and size)
- Environment variables for sensitive data

## Future Enhancements

- Push notifications for job alerts
- In-app messaging between teachers and schools
- Rating and review system
- Advanced search filters
- Video interview integration
- Document verification system
- Multi-language support (Somali, Arabic, English)

## Contributing

This is a proprietary project. For contributions or modifications, please contact the development team.

## Support

For technical support or questions, please contact the development team.

## License

Proprietary - All rights reserved

---

**Built with ❤️ for the education sector in Somalia**
