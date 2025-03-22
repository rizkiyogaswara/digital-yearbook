# PowerShell script to seed featured photos for March 14-16, 2025
# File: seed-featured-photos.ps1

# Server API URL - adjust if your server runs on a different port or host
$apiUrl = "http://localhost:3001/api"

Write-Host "=== Digital Yearbook Featured Photos Seeder ===" -ForegroundColor Cyan
Write-Host "This script will seed featured photos for March 14-16, 2025" -ForegroundColor Cyan
Write-Host

# Try to seed the featured photos using the dedicated endpoint
try {
    Write-Host "Seeding featured photos..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "$apiUrl/seed/featured" -Method Post
    
    Write-Host "Successfully seeded featured photos!" -ForegroundColor Green
    Write-Host "Featured photos:"
    
    foreach ($photo in $response.featuredPhotos) {
        Write-Host "- $($photo.title) featured for $($photo.date)" -ForegroundColor White
    }
} 
catch {
    Write-Host "Error using seed endpoint. Falling back to manual seeding..." -ForegroundColor Red
    
    # If the dedicated endpoint fails, try the manual approach
    try {
        # Step 1: Get all photos
        Write-Host "Fetching all photos..." -ForegroundColor Yellow
        $photos = Invoke-RestMethod -Uri "$apiUrl/photos" -Method Get
        
        if ($photos.Count -eq 0) {
            Write-Host "No photos found in the database. Please upload some photos first." -ForegroundColor Red
            exit
        }
        
        Write-Host "Found $($photos.Count) photos in the database." -ForegroundColor Green
        
        # Step 2: Define the dates we want to feature photos for
        $featuredDates = @(
            "2025-03-14",
            "2025-03-15",
            "2025-03-16"
        )
        
        # Step 3: Keep track of used photos to avoid duplicates
        $usedPhotoIds = @()
        $featuredPhotos = @()
        
        # Step 4: Select a random photo for each date
        foreach ($date in $featuredDates) {
            # Get available photos (excluding ones we've already used)
            $availablePhotos = $photos | Where-Object { $usedPhotoIds -notcontains $_._id }
            
            if ($availablePhotos.Count -eq 0) {
                Write-Host "No more available photos to feature for $date" -ForegroundColor Yellow
                break
            }
            
            # Select a random photo
            $randomIndex = Get-Random -Minimum 0 -Maximum $availablePhotos.Count
            $selectedPhoto = $availablePhotos[$randomIndex]
            
            # Mark it as featured
            $body = @{
                date = $date
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri "$apiUrl/photos/$($selectedPhoto._id)/feature" -Method Post -Body $body -ContentType "application/json"
            
            # Track the photo we've used
            $usedPhotoIds += $selectedPhoto._id
            $featuredPhotos += @{
                photoId = $selectedPhoto._id
                title = $selectedPhoto.title
                date = $date
            }
            
            Write-Host "Set photo '$($selectedPhoto.title)' as featured for $date" -ForegroundColor Green
        }
        
        Write-Host "Successfully seeded featured photos!" -ForegroundColor Green
        Write-Host "Featured photos:"
        
        foreach ($photo in $featuredPhotos) {
            Write-Host "- $($photo.title) featured for $($photo.date)" -ForegroundColor White
        }
    }
    catch {
        Write-Host "Error seeding featured photos: $_" -ForegroundColor Red
        exit
    }
}

Write-Host
Write-Host "=== Finished! ===" -ForegroundColor Cyan
