const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Set up MongoDB connection (using local MongoDB)
mongoose.connect('mongodb://localhost:27017/yearbook', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Define schemas
const userSchema = new mongoose.Schema({
  name: String,
  initials: String,
  graduation_year: String,
  class: [String],
  location: String,
  bio: String,
  photoCount: Number
});

// Updated photo schema with featured field
const photoSchema = new mongoose.Schema({
  title: String,
  description: String,
  filename: String,
  albumId: mongoose.Schema.Types.ObjectId,
  uploadedBy: String,
  uploadDate: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  featured: {
    isFeatured: { type: Boolean, default: false },
    featuredDate: Date
  },
  tags: [{
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    position: {
      x: Number,
      y: Number
    }
  }]
});

const albumSchema = new mongoose.Schema({
  name: String,
  description: String,
  createdBy: String,
  createdDate: { type: Date, default: Date.now },
  coverPhoto: String
});

// Create models
const User = mongoose.model('User', userSchema);
const Photo = mongoose.model('Photo', photoSchema);
const Album = mongoose.model('Album', albumSchema);

// Configure storage for file uploads with automatic renaming
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Use absolute path for uploads directory
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    // Get the album ID if provided in the request
    const albumId = req.body.albumId || 'noalbum';
    
    // Create a timestamp in YYYYMMDDHHMM format
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0');
    
    // Get the file extension from the original filename
    const extension = path.extname(file.originalname).toLowerCase();
    
    // Create the new filename: albumId-timestamp-randomstring.extension
    const randomString = Math.random().toString(36).substring(2, 8); // 6-character random string
    const newFilename = `${albumId}-${timestamp}-${randomString}${extension}`;
    
    cb(null, newFilename);
  }
});

// Add file filter to validate uploads
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// API Routes

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all albums with photo count
app.get('/api/albums', async (req, res) => {
  try {
    const albums = await Album.find();
    
    // Add photo count to each album
    const albumsWithCount = await Promise.all(albums.map(async (album) => {
      const photoCount = await Photo.countDocuments({ albumId: album._id });
      const albumObj = album.toObject();
      albumObj.photoCount = photoCount;
      return albumObj;
    }));
    
    res.json(albumsWithCount);
  } catch (err) {
    console.error('Error fetching albums:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get photos in an album with photo count
app.get('/api/albums/:id', async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }
    
    // Count photos in this album
    const photoCount = await Photo.countDocuments({ albumId: req.params.id });
    
    // Add the count to the album object
    const albumWithCount = album.toObject();
    albumWithCount.photoCount = photoCount;
    
    res.json(albumWithCount);
  } catch (err) {
    console.error('Error fetching album:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get photos in an album
app.get('/api/albums/:id/photos', async (req, res) => {
  try {
    const photos = await Photo.find({ albumId: req.params.id });
    res.json(photos);
  } catch (err) {
    console.error('Error fetching album photos:', err);
    res.status(500).json({ message: err.message });
  }
});

// NEW ENDPOINT: Get a random featured photo for a specific date
// Note: This needs to be defined before /api/photos/:id to avoid route conflicts
app.get('/api/photos/featured/random', async (req, res) => {
  try {
    // Get the date (default to current date if not provided)
    let targetDate = req.query.date ? new Date(req.query.date) : new Date();
    
    // Validate that the date is valid
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    // Adjust for GMT+7
    const offset = 7 * 60; // GMT+7 in minutes
    const dateGMT7 = new Date(targetDate.getTime() + offset * 60000);
    
    const year = dateGMT7.getUTCFullYear();
    const month = dateGMT7.getUTCMonth();
    const day = dateGMT7.getUTCDate();
    
    // Set the beginning and end of the day in GMT+7
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59));
    
    console.log(`Looking for featured photos on: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
    
    // First, try to find photos that are explicitly featured for this date
    let featuredPhotos = await Photo.find({
      'featured.isFeatured': true,
      'featured.featuredDate': {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    // If no featured photos found for this date, get a random photo
    if (!featuredPhotos || featuredPhotos.length === 0) {
      // Get the total count of photos
      const count = await Photo.countDocuments();
      
      if (count === 0) {
        return res.status(404).json({ message: 'No photos available' });
      }
      
      // Generate a random index
      const random = Math.floor(Math.random() * count);
      
      // Fetch one random photo
      featuredPhotos = await Photo.find().skip(random).limit(1);
      
      if (featuredPhotos.length === 0) {
        return res.status(404).json({ message: 'No photos available' });
      }
    }
    
    // Return the featured photo
    res.json(featuredPhotos[0]);
  } catch (err) {
    console.error('Error fetching random featured photo:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all photos with optional filtering - UPDATED FOR FEATURED PHOTOS
app.get('/api/photos', async (req, res) => {
  try {
    let query = {};
    
    // Apply filters if provided
    if (req.query.albumId) {
      query.albumId = req.query.albumId;
    }
    
    if (req.query.featured === 'true') {
      // Get current date (at the beginning of the day in GMT+7)
      const now = new Date();
      const offset = 7 * 60; // GMT+7 in minutes
      const nowGMT7 = new Date(now.getTime() + offset * 60000);
      
      const year = nowGMT7.getUTCFullYear();
      const month = nowGMT7.getUTCMonth();
      const day = nowGMT7.getUTCDate();
      
      // Set the current date to the beginning of the day (00:00:00) in GMT+7
      const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0));
      
      // Set the end of the day (23:59:59) in GMT+7
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59));
      
      console.log(`Fetching featured photos for date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
      
      // Look for photos featured for today
      query['featured.isFeatured'] = true;
      query['featured.featuredDate'] = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }
    
    // Apply limit if provided
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;
    
    // Get photos with optional limit
    let photosQuery = Photo.find(query).sort({uploadDate: -1});
    
    if (limit > 0) {
      photosQuery = photosQuery.limit(limit);
    }
    
    const photos = await photosQuery;
    res.json(photos);
  } catch (err) {
    console.error('Error fetching photos:', err);
    res.status(500).json({ message: err.message });
  }
});

// NEW ENDPOINT: Get photos for the memory feed (3 static photos)
app.get('/api/photos/feed', async (req, res) => {
  try {
    // Get 3 photos sorted by likes (most liked first)
    const feedPhotos = await Photo.find()
      .sort({ likes: -1 })
      .limit(3);
      
    // Get album info for each photo
    const enhancedPhotos = await Promise.all(feedPhotos.map(async (photo) => {
      const photoObj = photo.toObject();
      
      if (photo.albumId) {
        const album = await Album.findById(photo.albumId);
        if (album) {
          photoObj.albumName = album.name;
        }
      }
      
      return photoObj;
    }));
    
    res.json(enhancedPhotos);
  } catch (err) {
    console.error('Error fetching feed photos:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get single photo by ID
app.get('/api/photos/:id', async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    
    res.json(photo);
  } catch (err) {
    console.error('Error fetching photo:', err);
    res.status(500).json({ message: err.message });
  }
});

// NEW ENDPOINT: Mark a photo as featured for a specific date
app.post('/api/photos/:id/feature', async (req, res) => {
  try {
    // Validate the date (default to current date if not provided)
    let featuredDate = req.body.date ? new Date(req.body.date) : new Date();
    
    // Validate that the date is valid
    if (isNaN(featuredDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    // Set the time to 5:00 AM GMT+7
    const offset = 7 * 60; // GMT+7 in minutes
    
    // Extract date components using UTC methods after adjusting for GMT+7
    const adjustedDate = new Date(featuredDate.getTime() + offset * 60000);
    const year = adjustedDate.getUTCFullYear();
    const month = adjustedDate.getUTCMonth();
    const day = adjustedDate.getUTCDate();
    
    // Create a new date at 5:00 AM GMT+7 (which is 22:00 UTC of the previous day)
    featuredDate = new Date(Date.UTC(year, month, day, -2, 0, 0));
    
    // Find the photo
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    
    // Update the photo to be featured
    photo.featured = {
      isFeatured: true,
      featuredDate: featuredDate
    };
    
    const updatedPhoto = await photo.save();
    res.json(updatedPhoto);
  } catch (err) {
    console.error('Error featuring photo:', err);
    res.status(400).json({ message: err.message });
  }
});

// Upload a photo with improved error handling
app.post('/api/photos/upload', upload.single('photo'), async (req, res) => {
  try {
    console.log('File uploaded:', req.file);
    console.log('Form data:', req.body);
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const photoData = {
      title: req.body.title || 'Untitled Photo',
      description: req.body.description || '',
      filename: req.file.filename, // This will be our new renamed file
      uploadedBy: req.body.uploadedBy || 'Anonymous'
    };

    // Only add albumId if it's a valid MongoDB ObjectId
    if (req.body.albumId && mongoose.Types.ObjectId.isValid(req.body.albumId)) {
      photoData.albumId = req.body.albumId;
    }

    const photo = new Photo(photoData);
    const newPhoto = await photo.save();
    
    // If this is the first photo in an album, make it the cover photo
    if (photoData.albumId) {
      const album = await Album.findById(photoData.albumId);
      if (album && !album.coverPhoto) {
        album.coverPhoto = photoData.filename;
        await album.save();
        console.log(`Set cover photo for album "${album.name}"`);
      }
    }
    
    res.status(201).json(newPhoto);
  } catch (err) {
    console.error('Error saving photo:', err);
    // If there was an error saving to the database but the file was uploaded,
    // we should clean up the file to avoid orphaned files
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Cleaned up file after database error:', req.file.path);
      } catch (unlinkErr) {
        console.error('Error deleting uploaded file after DB error:', unlinkErr);
      }
    }
    res.status(400).json({ message: err.message });
  }
});

// Create a new album
app.post('/api/albums', async (req, res) => {
  const album = new Album({
    name: req.body.name,
    description: req.body.description,
    createdBy: req.body.createdBy,
    coverPhoto: req.body.coverPhoto
  });

  try {
    const newAlbum = await album.save();
    res.status(201).json(newAlbum);
  } catch (err) {
    console.error('Error creating album:', err);
    res.status(400).json({ message: err.message });
  }
});

// Like a photo
app.patch('/api/photos/:id/like', async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    
    photo.likes += 1;
    const updatedPhoto = await photo.save();
    res.json(updatedPhoto);
  } catch (err) {
    console.error('Error liking photo:', err);
    res.status(400).json({ message: err.message });
  }
});

// Unlike a photo
app.patch('/api/photos/:id/unlike', async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    
    // Prevent negative likes
    if (photo.likes > 0) {
      photo.likes -= 1;
    }
    
    const updatedPhoto = await photo.save();
    res.json(updatedPhoto);
  } catch (err) {
    console.error('Error unliking photo:', err);
    res.status(400).json({ message: err.message });
  }
});

// Add a user tag to a photo
app.post('/api/photos/:id/tags', async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    
    // Validate that userId is a valid ObjectId if provided
    if (req.body.userId && !mongoose.Types.ObjectId.isValid(req.body.userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    photo.tags.push({
      userId: req.body.userId || null,
      name: req.body.name,
      position: {
        x: req.body.position.x,
        y: req.body.position.y
      }
    });
    
    const updatedPhoto = await photo.save();
    res.status(201).json(updatedPhoto);
  } catch (err) {
    console.error('Error adding tag:', err);
    res.status(400).json({ message: err.message });
  }
});

// Error handler for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 5MB.' 
      });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    console.error('Unhandled error:', err);
    return res.status(500).json({ message: err.message });
  }
  next();
});

// Seed initial data
app.post('/api/seed', async (req, res) => {
  try {
    // Create sample users
    const users = [
      {
        name: 'Rizki Yogaswara',
        initials: 'RY',
        graduation_year: 'Class of 2002',
        class: ['1-C','2-F','3-IPA-3'],
        location: 'Tangerang Selatan, Indonesia',
        bio: 'Captain of the football team. Going to University of Washington to study Business.',
        photoCount: 23
      },
      {
        name: 'Enggar Paramita',
        initials: 'EP',
        graduation_year: 'Class of 2002',
        class: ['1-F','2-G','3-IPS-2'],
        location: 'Bandung, Indonesia',
        bio: 'Flute player in the marching band and president of the debate club.',
        photoCount: 12
      },
      {
        name: 'Brian Baker',
        initials: 'BB',
        graduation_year: 'Class of 2002',
        class: ['1-B','2-A','3-IPA-1'],
        location: 'Chicago, IL',
        bio: 'Starting pitcher for the baseball team and class treasurer.',
        photoCount: 34
      }
    ];
    
    await User.deleteMany({});
    await User.insertMany(users);
    
    // Create sample albums
    const albums = [
      {
        name: 'Graduation Day',
        description: 'Photos from our graduation ceremony on June 15, 2002.',
        createdBy: 'Rizki Yogaswara'
      },
      {
        name: 'Senior Trip',
        description: 'Our amazing senior trip to Blue Lake State Park!',
        createdBy: 'Enggar Paramita'
      },
      {
        name: 'Prom Night',
        description: 'Our amazing prom night at the Grand Hotel!',
        createdBy: 'Brian Baker'
      },
      {
        name: 'Football Championship',
        description: 'Our victorious football team bringing home the state championship!',
        createdBy: 'Brian Baker'
      },
      {
        name: 'First Day of Senior Year',
        description: 'Our last first day of high school! Senior year begins.',
        createdBy: 'Enggar Paramita'
      }
    ];
    
    await Album.deleteMany({});
    const savedAlbums = await Album.insertMany(albums);
    
    res.json({ 
      message: 'Seed data created successfully',
      users: users.length,
      albums: albums.length,
      note: 'Photos were not seeded. Use /api/seed/photos to seed photos.'
    });
  } catch (err) {
    console.error('Error seeding data:', err);
    res.status(500).json({ message: err.message });
  }
});

// Seed photos function to use pre-prepared photos in seed-photos directory
app.post('/api/seed/photos', async (req, res) => {
  try {
    // Get all saved albums to link photos to
    const albums = await Album.find();
    if (albums.length === 0) {
      return res.status(400).json({ message: 'No albums found. Please create albums first.' });
    }

    // Map album names to their IDs for easier reference
    const albumMap = {};
    albums.forEach(album => {
      albumMap[album.name.toLowerCase()] = album._id;
    });

    // Seed photos data with the actual filenames you have
    // Using the filenames: 20, 41, 44, 45, 46, PHOTO-2022-11-18-09-08-33
    const photoData = [
      { 
        title: 'Graduation Ceremony',
        description: 'The main graduation ceremony at the auditorium',
        albumId: albumMap['graduation day'],
        uploadedBy: 'Rizki Yogaswara',
        likes: 42
      },
      {
        title: 'Senior Group Photo',
        description: 'The entire senior class gathered for our annual photo',
        albumId: albumMap['graduation day'],
        uploadedBy: 'Enggar Paramita',
        likes: 38
      },
      {
        title: 'Senior Trip Adventure',
        description: 'Our exciting trip to the mountains',
        albumId: albumMap['senior trip'], 
        uploadedBy: 'Brian Baker',
        likes: 54
      },
      {
        title: 'Prom Night Celebration',
        description: 'Dancing the night away at prom',
        albumId: albumMap['prom night'],
        uploadedBy: 'Rizki Yogaswara',
        likes: 27
      },
      {
        title: 'Football Championship Game',
        description: 'The winning moment of our championship game',
        albumId: albumMap['football championship'],
        uploadedBy: 'Brian Baker',
        likes: 49
      },
      {
        title: 'First Day of Senior Year',
        description: 'Our first day back as seniors',
        albumId: albumMap['first day of senior year'],
        uploadedBy: 'Enggar Paramita',
        likes: 44
      }
    ];

    // Prepare the uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Read seed photos directory
    const seedPhotosDir = path.join(__dirname, '../seed-photos');
    
    // Check if seed-photos directory exists
    if (!fs.existsSync(seedPhotosDir)) {
      return res.status(400).json({ 
        message: 'Seed photos directory not found. Please create a "seed-photos" directory with your prepared photos.' 
      });
    }

    // Clear existing photos
    await Photo.deleteMany({});
    
    // Read all files from seed-photos directory
    const availableFiles = fs.readdirSync(seedPhotosDir);
    console.log('Available seed files:', availableFiles);

    // List of seed photo filenames to use (without extension)
    const seedPhotoBasenames = ['20', '41', '44', '45', '46', 'PHOTO-2022-11-18-09-08-33'];
    
    // Process each photo in our data
    const createdPhotos = [];
    let photoIndex = 0;
    
    for (const photo of photoData) {
      // Find matching file from available files
      const baseFilename = seedPhotoBasenames[photoIndex];
      const matchingFile = availableFiles.find(file => 
        file === baseFilename || file.startsWith(baseFilename + '.')
      );
      
      if (!matchingFile) {
        console.warn(`Warning: File with basename ${baseFilename} not found in seed-photos directory, skipping.`);
        photoIndex++;
        continue;
      }

      // Generate a new filename using our format
      const now = new Date();
      const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0');
      
      const extension = path.extname(matchingFile);
      const albumId = photo.albumId || 'noalbum';
      const randomString = Math.random().toString(36).substring(2, 8);
      const newFilename = `${albumId}-${timestamp}-${randomString}${extension}`;
      
      // Copy the file to uploads directory with the new name
      fs.copyFileSync(
        path.join(seedPhotosDir, matchingFile),
        path.join(uploadsDir, newFilename)
      );

      // Add the filename to the photo data
      photo.filename = newFilename;
      
      // Create the photo record in database
      const newPhoto = new Photo(photo);
      const savedPhoto = await newPhoto.save();
      createdPhotos.push(savedPhoto);
      
      photoIndex++;
    }

    // After creating photos, update each album's cover photo
    for (const album of albums) {
      // Find the first photo for this album
      const albumPhoto = createdPhotos.find(photo => 
        photo.albumId && photo.albumId.toString() === album._id.toString()
      );

      if (albumPhoto) {
        album.coverPhoto = albumPhoto.filename;
        await album.save();
        console.log(`Updated cover photo for album "${album.name}"`);
      }
    }

    res.status(201).json({
      message: 'Seed photos created successfully',
      photosAdded: createdPhotos.length,
      albumsUpdated: albums.length
    });
  } catch (err) {
    console.error('Error seeding photos:', err);
    res.status(500).json({ message: err.message });
  }
});

// NEW ENDPOINT: Seed featured photos for specific dates
app.post('/api/seed/featured', async (req, res) => {
  try {
    // Get all photos
    const photos = await Photo.find();
    
    if (photos.length === 0) {
      return res.status(400).json({ message: 'No photos found. Please add some photos first.' });
    }
    
    // Define the dates for which we want to feature photos
    const featuredDates = [
      new Date('2025-03-14'),
      new Date('2025-03-15'),
      new Date('2025-03-16')
    ];
    
    // Keep track of which photos we've used to avoid duplicates
    const usedPhotoIds = [];
    const featuredPhotos = [];
    
    // Set a featured photo for each date
    for (const date of featuredDates) {
      // Get available photos (excluding ones we've already used)
      const availablePhotos = photos.filter(photo => !usedPhotoIds.includes(photo._id.toString()));
      
      if (availablePhotos.length === 0) {
        console.log(`No more available photos to feature for ${date.toISOString()}`);
        break;
      }
      
      // Select a random photo
      const randomIndex = Math.floor(Math.random() * availablePhotos.length);
      const selectedPhoto = availablePhotos[randomIndex];
      
      // Set the time to 5:00 AM GMT+7
      const offset = 7 * 60; // GMT+7 in minutes
      
      // Extract date components using UTC methods after adjusting for GMT+7
      const adjustedDate = new Date(date.getTime() + offset * 60000);
      const year = adjustedDate.getUTCFullYear();
      const month = adjustedDate.getUTCMonth();
      const day = adjustedDate.getUTCDate();
      
      // Create a new date at 5:00 AM GMT+7 (which is 22:00 UTC of the previous day)
      const featuredDate = new Date(Date.UTC(year, month, day, -2, 0, 0));
      
      // Update the photo to be featured
      selectedPhoto.featured = {
        isFeatured: true,
        featuredDate: featuredDate
      };
      
      const updatedPhoto = await selectedPhoto.save();
      
      // Add to our tracking arrays
      usedPhotoIds.push(selectedPhoto._id.toString());
      featuredPhotos.push({
        photoId: selectedPhoto._id,
        title: selectedPhoto.title,
        date: featuredDate.toISOString()
      });
      
      console.log(`Set photo "${selectedPhoto.title}" as featured for ${featuredDate.toISOString()}`);
    }
    
    res.status(200).json({
message: 'Featured photos seeded successfully',
      featuredPhotos: featuredPhotos
    });
  } catch (err) {
    console.error('Error seeding featured photos:', err);
    res.status(500).json({ message: err.message });
  }
});

// Serve the main HTML file for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '../uploads');
  console.log('Uploads directory path:', uploadsDir);
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('Creating uploads directory');
    fs.mkdirSync(uploadsDir, { recursive: true });
  } else {
    console.log('Uploads directory already exists');
  }
});