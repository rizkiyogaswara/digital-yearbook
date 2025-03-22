// backend/controllers/seedController.js
const User = require('../models/User');
const Album = require('../models/Album');
const Photo = require('../models/Photo');
const path = require('path');
const fs = require('fs');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Seed initial user and album data
const seedData = async (req, res) => {
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
    
    return successResponse(res, { 
      message: 'Seed data created successfully',
      users: users.length,
      albums: albums.length,
      note: 'Photos were not seeded. Use /api/seed/photos to seed photos.'
    });
  } catch (err) {
    console.error('Error seeding data:', err);
    return errorResponse(res, err.message, 500);
  }
};

// Seed photos using pre-prepared photos in seed-photos directory
const seedPhotos = async (req, res) => {
  try {
    // Get all saved albums to link photos to
    const albums = await Album.find();
    if (albums.length === 0) {
      return errorResponse(res, 'No albums found. Please create albums first.', 400);
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
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Read seed photos directory
    const seedPhotosDir = path.join(__dirname, '../../seed-photos');
    
    // Check if seed-photos directory exists
    if (!fs.existsSync(seedPhotosDir)) {
      return errorResponse(res, 'Seed photos directory not found. Please create a "seed-photos" directory with your prepared photos.', 400);
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

    return successResponse(res, {
      message: 'Seed photos created successfully',
      photosAdded: createdPhotos.length,
      albumsUpdated: albums.length
    }, 201);
  } catch (err) {
    console.error('Error seeding photos:', err);
    return errorResponse(res, err.message, 500);
  }
};

// Seed featured photos for specific dates
const seedFeaturedPhotos = async (req, res) => {
  try {
    // Get all photos
    const photos = await Photo.find();
    
    if (photos.length === 0) {
      return errorResponse(res, 'No photos found. Please add some photos first.', 400);
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
    
    return successResponse(res, {
      message: 'Featured photos seeded successfully',
      featuredPhotos: featuredPhotos
    });
  } catch (err) {
    console.error('Error seeding featured photos:', err);
    return errorResponse(res, err.message, 500);
  }
};

module.exports = {
    seedData,
    seedPhotos,
    seedFeaturedPhotos
};