const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
require('dotenv').config();

// Google Maps API key
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBnFPaORmcuPd-TqYUSW6iqEJUczimguk8';

// Log API key status on startup (without exposing the full key)
if (GOOGLE_MAPS_API_KEY) {
  console.log('✅ Google Maps API Key loaded:', GOOGLE_MAPS_API_KEY.substring(0, 10) + '...');
} else {
  console.warn('⚠️ Google Maps API Key not found!');
}

// Get current location and find nearest location from database
router.post('/detect-location', authenticate, async (req, res) => {
  try {
    console.log('=== Detect Location Request Received ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? 'Present' : 'Missing'
    });
    
    const { latitude, longitude } = req.body;

    // Validate latitude and longitude
    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
        received: { latitude, longitude }
      });
    }

    // Convert to numbers and validate ranges
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude must be valid numbers',
        received: { latitude, longitude }
      });
    }

    if (lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90',
        received: { latitude: lat }
      });
    }

    if (lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be between -180 and 180',
        received: { longitude: lng }
      });
    }

    // Validate API key
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.trim() === '') {
      console.error('❌ Google Maps API Key is missing or empty!');
      return res.status(500).json({
        success: false,
        message: 'Google Maps API key is not configured',
      });
    }

    // Format coordinates properly (ensure they're numbers with proper precision)
    const formattedLat = lat.toFixed(6);
    const formattedLng = lng.toFixed(6);
    
    // Build the geocoding URL
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${formattedLat},${formattedLng}&key=${GOOGLE_MAPS_API_KEY}`;
    
    console.log('=== Geocoding Request ===');
    console.log('URL (key hidden):', geocodingUrl.replace(GOOGLE_MAPS_API_KEY, 'API_KEY_HIDDEN'));
    console.log('Latitude:', formattedLat, '(raw:', lat, ')');
    console.log('Longitude:', formattedLng, '(raw:', lng, ')');
    console.log('API Key present:', !!GOOGLE_MAPS_API_KEY);
    console.log('API Key length:', GOOGLE_MAPS_API_KEY.length);
    console.log('API Key prefix:', GOOGLE_MAPS_API_KEY.substring(0, 10) + '...');
    console.log('API Key suffix:', '...' + GOOGLE_MAPS_API_KEY.substring(GOOGLE_MAPS_API_KEY.length - 10));
    
    let geocodingResponse;
    let geocodingData;
    
    try {
      geocodingResponse = await fetch(geocodingUrl);
      geocodingData = await geocodingResponse.json();
      
      console.log('=== Geocoding Response ===');
      console.log('HTTP Status Code:', geocodingResponse.status);
      console.log('API Status:', geocodingData.status);
      console.log('Error Message:', geocodingData.error_message || 'None');
      console.log('Results Count:', geocodingData.results?.length || 0);
      
      if (geocodingData.status !== 'OK') {
        console.error('❌ Geocoding API Error - Full Response:');
        console.error(JSON.stringify(geocodingData, null, 2));
        console.error('Request URL (key hidden):', geocodingUrl.replace(GOOGLE_MAPS_API_KEY, 'API_KEY_HIDDEN'));
        
        // Log specific error details
        if (geocodingData.error_message) {
          console.error('Error Message:', geocodingData.error_message);
        }
        if (geocodingData.results) {
          console.error('Results:', geocodingData.results);
        }
      } else {
        console.log('✅ Geocoding API Success');
      }
    } catch (fetchError) {
      console.error('=== Geocoding Fetch Error ===');
      console.error('Error:', fetchError.message);
      console.error('Stack:', fetchError.stack);
      throw new Error(`Failed to call Geocoding API: ${fetchError.message}`);
    }

      if (geocodingData.status !== 'OK') {
        // Handle different error statuses
        let errorMessage = 'Could not determine location from coordinates';
        let httpStatus = 400;
        
        if (geocodingData.status === 'ZERO_RESULTS') {
          errorMessage = 'No location found for the given coordinates';
          httpStatus = 404;
        } else if (geocodingData.status === 'REQUEST_DENIED') {
          const errorMsg = geocodingData.error_message || 'Request denied. Please check your API key and permissions.';
          errorMessage = `Geocoding API error: ${errorMsg}`;
          console.error('Geocoding API denied:', errorMsg);
          
          // Special handling for referrer restriction error
          if (errorMsg.includes('referer restrictions') || errorMsg.includes('referrer restrictions')) {
            console.error('⚠️ IMPORTANT: Your API key has referrer restrictions.');
            console.error('⚠️ Backend geocoding requires a server-side API key with IP restrictions (NOT referrer restrictions).');
            console.error('⚠️ See: backend/GOOGLE_MAPS_API_KEY_SETUP.md for setup instructions.');
            errorMessage = `Geocoding API error: API key has referrer restrictions. Backend requires a server-side key with IP restrictions. See documentation for setup.`;
          }
          httpStatus = 403;
        } else if (geocodingData.status === 'OVER_QUERY_LIMIT') {
          errorMessage = 'Geocoding API quota exceeded. Please try again later.';
          httpStatus = 429;
        } else if (geocodingData.status === 'INVALID_REQUEST') {
          errorMessage = `Invalid request: ${geocodingData.error_message || 'Please check the coordinates'}`;
          httpStatus = 400;
        } else if (geocodingData.status === 'UNKNOWN_ERROR') {
          errorMessage = 'Geocoding service temporarily unavailable. Please try again.';
          httpStatus = 503;
        }
        
        const errorResponse = {
          success: false,
          message: errorMessage,
          status: geocodingData.status,
          error_message: geocodingData.error_message || null,
          details: geocodingData,
          request: {
            latitude: formattedLat,
            longitude: formattedLng,
            url: geocodingUrl.replace(GOOGLE_MAPS_API_KEY, 'API_KEY_HIDDEN')
          }
        };
        
        console.error('Returning error response:', JSON.stringify(errorResponse, null, 2));
        
        return res.status(httpStatus).json(errorResponse);
      }

    if (!geocodingData.results || geocodingData.results.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No location results found for the given coordinates',
      });
    }

    const result = geocodingData.results[0];
    const addressComponents = result.address_components;

    // Extract location details
    let city = null;
    let state = null;
    let neighbourhood = null;
    let pincode = null;
    let locationName = null;

    addressComponents.forEach((component) => {
      const types = component.types;
      if (types.includes('locality') || types.includes('sublocality_level_1')) {
        city = component.long_name;
      }
      if (types.includes('sublocality') || types.includes('sublocality_level_2') || types.includes('neighborhood')) {
        neighbourhood = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
      if (types.includes('postal_code')) {
        pincode = component.long_name;
      }
    });

    // Use formatted address or city+state as location name
    locationName = result.formatted_address || `${city || ''}${state ? ', ' + state : ''}`.trim();

    // Find nearest location in database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Find locations with coordinates
    const locations = await prisma.location.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        latitude: true,
        longitude: true,
        city: true,
        state: true,
        pincode: true,
      },
    });

    // Calculate distance to each location
    const locationsWithDistance = locations.map((loc) => {
      const distance = calculateDistance(
        lat,
        lng,
        loc.latitude,
        loc.longitude
      );
      return { ...loc, distance };
    });

    // Sort by distance and get nearest
    locationsWithDistance.sort((a, b) => a.distance - b.distance);
    const nearestLocation = locationsWithDistance[0];

    // Haversine formula to calculate distance
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in kilometers
    }

    res.json({
      success: true,
      detectedLocation: {
        name: locationName,
        city,
        state,
        neighbourhood,
        pincode,
        latitude: lat,
        longitude: lng,
        formattedAddress: result.formatted_address,
      },
      nearestLocation: nearestLocation ? {
        id: nearestLocation.id,
        name: nearestLocation.name,
        slug: nearestLocation.slug,
        distance: nearestLocation.distance.toFixed(2),
      } : null,
      allNearbyLocations: locationsWithDistance.slice(0, 5).map((loc) => ({
        id: loc.id,
        name: loc.name,
        slug: loc.slug,
        distance: loc.distance.toFixed(2),
      })),
    });
  } catch (error) {
    console.error('=== Geocoding Route Error ===');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Request Body:', req.body);
    console.error('Request Headers:', {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? 'Present' : 'Missing'
    });
    
    // Determine appropriate status code
    let statusCode = 500;
    let errorMessage = error.message || 'Failed to detect location';
    
    // Check if it's a validation error or API error
    if (error.message && error.message.includes('required')) {
      statusCode = 400;
    } else if (error.message && error.message.includes('Invalid')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        type: error.constructor.name
      } : undefined
    });
  }
});

// Geocode address string to coordinates
router.post('/geocode-address', authenticate, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required',
      });
    }

    // Validate API key
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.trim() === '') {
      console.error('❌ Google Maps API Key is missing or empty!');
      return res.status(500).json({
        success: false,
        message: 'Google Maps API key is not configured',
      });
    }

    // Encode address properly
    const encodedAddress = encodeURIComponent(address);
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
    
    console.log('=== Geocoding Address Request ===');
    console.log('URL (key hidden):', geocodingUrl.replace(GOOGLE_MAPS_API_KEY, 'API_KEY_HIDDEN'));
    console.log('Address (raw):', address);
    console.log('Address (encoded):', encodedAddress);
    console.log('API Key present:', !!GOOGLE_MAPS_API_KEY);
    console.log('API Key length:', GOOGLE_MAPS_API_KEY.length);
    console.log('API Key prefix:', GOOGLE_MAPS_API_KEY.substring(0, 10) + '...');
    console.log('API Key suffix:', '...' + GOOGLE_MAPS_API_KEY.substring(GOOGLE_MAPS_API_KEY.length - 10));
    
    let geocodingResponse;
    let geocodingData;
    
    try {
      geocodingResponse = await fetch(geocodingUrl);
      geocodingData = await geocodingResponse.json();
      
      console.log('=== Geocoding Address Response ===');
      console.log('HTTP Status Code:', geocodingResponse.status);
      console.log('API Status:', geocodingData.status);
      console.log('Error Message:', geocodingData.error_message || 'None');
      console.log('Results Count:', geocodingData.results?.length || 0);
      
      if (geocodingData.status !== 'OK') {
        console.error('❌ Geocoding API Error - Full Response:');
        console.error(JSON.stringify(geocodingData, null, 2));
        console.error('Request URL (key hidden):', geocodingUrl.replace(GOOGLE_MAPS_API_KEY, 'API_KEY_HIDDEN'));
        
        // Log specific error details
        if (geocodingData.error_message) {
          console.error('Error Message:', geocodingData.error_message);
        }
        if (geocodingData.results) {
          console.error('Results:', geocodingData.results);
        }
      } else {
        console.log('✅ Geocoding API Success');
      }
    } catch (fetchError) {
      console.error('=== Geocoding Address Fetch Error ===');
      console.error('Error:', fetchError.message);
      console.error('Stack:', fetchError.stack);
      throw new Error(`Failed to call Geocoding API: ${fetchError.message}`);
    }

    if (geocodingData.status !== 'OK') {
      // Handle different error statuses
      let errorMessage = 'Could not find location for the given address';
      
      if (geocodingData.status === 'ZERO_RESULTS') {
        errorMessage = 'No location found for the given address';
      } else if (geocodingData.status === 'REQUEST_DENIED') {
        const errorMsg = geocodingData.error_message || 'Request denied. Please check your API key and permissions.';
        errorMessage = `Geocoding API error: ${errorMsg}`;
        console.error('Geocoding API denied:', errorMsg);
        
        // Special handling for referrer restriction error
        if (errorMsg.includes('referer restrictions') || errorMsg.includes('referrer restrictions')) {
          console.error('⚠️ IMPORTANT: Your API key has referrer restrictions.');
          console.error('⚠️ Backend geocoding requires a server-side API key with IP restrictions (NOT referrer restrictions).');
          console.error('⚠️ See: backend/GOOGLE_MAPS_API_KEY_SETUP.md for setup instructions.');
          errorMessage = `Geocoding API error: API key has referrer restrictions. Backend requires a server-side key with IP restrictions. See documentation for setup.`;
        }
      } else if (geocodingData.status === 'OVER_QUERY_LIMIT') {
        errorMessage = 'Geocoding API quota exceeded. Please try again later.';
      } else if (geocodingData.status === 'INVALID_REQUEST') {
        errorMessage = `Invalid request: ${geocodingData.error_message || 'Please check the address'}`;
      } else if (geocodingData.status === 'UNKNOWN_ERROR') {
        errorMessage = 'Geocoding service temporarily unavailable. Please try again.';
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        status: geocodingData.status,
        details: geocodingData.error_message || null,
      });
    }

    if (!geocodingData.results || geocodingData.results.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No location results found for the given address',
      });
    }

    const result = geocodingData.results[0];
    const location = result.geometry.location;
    const addressComponents = result.address_components;

    let city = null;
    let state = null;
    let pincode = null;

    addressComponents.forEach((component) => {
      const types = component.types;
      if (types.includes('locality') || types.includes('sublocality')) {
        city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
      if (types.includes('postal_code')) {
        pincode = component.long_name;
      }
    });

    res.json({
      success: true,
      location: {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
        city,
        state,
        pincode,
      },
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to geocode address',
    });
  }
});

module.exports = router;

