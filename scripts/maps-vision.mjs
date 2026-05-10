#!/usr/bin/env node
/**
 * maps-vision.mjs — Get visual findings from Google Maps photos
 *
 * Uses Places API photos + Gemini Vision instead of headless browser scraping.
 * Reliable, never blocked.
 *
 * Usage:
 *   node scripts/maps-vision.mjs <business-name> <sector>
 *
 * Output: JSON with visual findings about the business.
 */

const GEMINI_KEY = 'AIzaSyAXEoanwbkYrmlw7tbXy1b6GoNr-sv2WpM';
const PLACES_KEY = 'AIzaSyBFcHYlDBMHdtr3RmiUmp8AvPhAlGLjpJI';

const businessName = process.argv[2];
const sector = process.argv[3] || '';

if (!businessName) {
  console.log(JSON.stringify({
    success: false,
    error: 'Business name required',
    visual_findings: `No photo analysis available for ${businessName}. Sector: ${sector}. Generating description from business type.`
  }));
  process.exit(1);
}

async function getPhotoAnalysis() {
  // Step 1: Search Places API for photos
  const searchRes = await fetch(
    `https://places.googleapis.com/v1/places:searchText`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.photos(name,widthPx,heightPx),places.rating,places.userRatingCount,places.formattedAddress,places.types',
      },
      body: JSON.stringify({
        textQuery: `${businessName} Seremban Malaysia`,
        maxResultCount: 1,
      }),
    }
  );

  if (!searchRes.ok) {
    throw new Error(`Places API error: ${searchRes.status}`);
  }

  const searchData = await searchRes.json();
  const place = searchData?.places?.[0];
  
  if (!place) {
    return {
      success: true,
      source: 'sector-default',
      visual_findings: `Google Maps listing not found. Based on the "${sector}" category, typical visual style: clean and professional.`,
    };
  }

  const photos = place.photos || [];
  
  if (photos.length === 0) {
    return {
      success: true,
      source: 'no-photos',
      rating: place.rating,
      reviews: place.userRatingCount,
      visual_findings: `No photos available for this business. ${place.rating}★ rating suggests established operation. Sector: ${sector}.`,
    };
  }

  // Step 2: Download the first photo
  const photoRef = photos[0].name.split('/').pop();
  const photoRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${encodeURIComponent(photoRef)}&key=${PLACES_KEY}`
  );

  if (!photoRes.ok || !photoRes.headers.get('content-type')?.includes('image')) {
    return {
      success: true,
      source: 'photo-download-failed',
      rating: place.rating,
      reviews: place.userRatingCount,
      visual_findings: `Found ${photos.length} photos but could not download. ${place.rating}★ rating from ${place.userRatingCount} reviews. Sector: ${sector}.`,
    };
  }

  const photoBuffer = Buffer.from(await photoRes.arrayBuffer());
  const base64Photo = photoBuffer.toString('base64');

  // Step 3: Analyze with Gemini Vision
  const visionRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: base64Photo } },
            {
              text: `Analyze this business photo for a ${sector} company. Extract:
1) Brand colors (list specific hex-approximate colors seen on signage, building, logo)
2) Signage style (modern/traditional/neon/painted, font style if visible)
3) Storefront appearance (building type, cleanliness, professional look)
4) Logo description (if visible)
5) Overall vibe (premium/budget/friendly/corporate/local)

Be specific. Output as concise bullet points. If multiple colors, list them all.`
            }
          ]
        }]
      })
    }
  );

  if (!visionRes.ok) {
    return {
      success: true,
      source: 'vision-failed',
      rating: place.rating,
      reviews: place.userRatingCount,
      visual_findings: `Photo found but vision analysis failed. Photo shows a ${sector} business with ${place.rating}★ rating.`,
    };
  }

  const visionData = await visionRes.json();
  const analysis = visionData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis';

  return {
    success: true,
    source: 'photo+vision',
    rating: place.rating,
    reviews: place.userRatingCount,
    photos_available: photos.length,
    visual_findings: analysis,
    photo_width: photos[0].widthPx,
    photo_height: photos[0].heightPx,
  };
}

getPhotoAnalysis()
  .then(result => console.log(JSON.stringify(result, null, 2)))
  .catch(err => console.log(JSON.stringify({
    success: false,
    error: err.message,
    visual_findings: `Visual analysis unavailable for ${businessName}. Sector: ${sector}.`
  })));
