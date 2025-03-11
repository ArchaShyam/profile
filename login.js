







  // Firebase Admin SDK Backend for JobHive
  const express = require('express');
  const cors = require('cors');
  const admin = require('firebase-admin');
  const bodyParser = require('body-parser');
  
  // Initialize the app
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());
  
  // Initialize Firebase Admin with your service account
  // You should download the service account JSON from Firebase Console
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://your-project-id.firebaseio.com'
  });
  
  // Reference to Firestore
  const db = admin.firestore();
  // Reference to Authentication
  const auth = admin.auth();
  
  // API endpoint to create a new user (for signup)
  app.post('/api/users', async (req, res) => {
    try {
      const { email, password, firstName, lastName, userType } = req.body;
      
      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });
      
      // Store additional user information in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        firstName,
        lastName,
        email,
        userType, // 'employer' or 'job-seeker'
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      res.status(201).json({ message: 'User created successfully', userId: userRecord.uid });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // API endpoint to verify user tokens (for protected routes)
  app.post('/api/verify-token', async (req, res) => {
    try {
      const { idToken } = req.body;
      
      // Verify the ID token
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      
      // Get user data from Firestore
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Update last login time
      await db.collection('users').doc(uid).update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Return user data
      res.status(200).json({ 
        user: { 
          uid,
          email: decodedToken.email,
          ...userDoc.data() 
        } 
      });
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  });
  
  // API endpoint for password reset
  app.post('/api/reset-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      // Generate password reset link
      const link = await auth.generatePasswordResetLink(email);
      
      // In a production environment, you would send this link via email
      // For this example, we're just returning it in the response
      res.status(200).json({ 
        message: 'Password reset link generated',
        link 
      });
    } catch (error) {
      console.error('Error generating password reset link:', error);
      res.status(400).json({ error: error.message });
    }
  });
  
  // API endpoint to get job listings
  app.get('/api/jobs', async (req, res) => {
    try {
      const jobsSnapshot = await db.collection('jobs')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      
      const jobs = [];
      jobsSnapshot.forEach(doc => {
        jobs.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      res.status(200).json({ jobs });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // API endpoint to create a new job listing
  app.post('/api/jobs', async (req, res) => {
    try {
      const { title, company, location, description, requirements, salary, idToken } = req.body;
      
      // Verify the ID token to ensure user is authorized
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      
      // Check if user is an employer
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists || userDoc.data().userType !== 'employer') {
        return res.status(403).json({ error: 'Only employers can post jobs' });
      }
      
      // Create job listing
      const jobRef = await db.collection('jobs').add({
        title,
        company,
        location,
        description,
        requirements,
        salary,
        employerId: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        active: true
      });
      
      res.status(201).json({ 
        message: 'Job created successfully', 
        jobId: jobRef.id 
      });
    } catch (error) {
      console.error('Error creating job:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // API endpoint for job applications
  app.post('/api/applications', async (req, res) => {
    try {
      const { jobId, resume, coverLetter, idToken } = req.body;
      
      // Verify the ID token
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      
      // Check if user is a job seeker
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists || userDoc.data().userType !== 'job-seeker') {
        return res.status(403).json({ error: 'Only job seekers can apply for jobs' });
      }
      
      // Check if job exists
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      // Create application
      const applicationRef = await db.collection('applications').add({
        jobId,
        jobTitle: jobDoc.data().title,
        company: jobDoc.data().company,
        applicantId: uid,
        applicantName: userDoc.data().firstName + ' ' + userDoc.data().lastName,
        applicantEmail: decodedToken.email,
        resume,
        coverLetter,
        status: 'pending',
        appliedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.status(201).json({ 
        message: 'Application submitted successfully', 
        applicationId: applicationRef.id 
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Start the server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
