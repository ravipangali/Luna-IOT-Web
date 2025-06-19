export interface ReverseGeocodingResult {
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  lat: string;
  lon: string;
}

interface CachedAddress {
  address: string;
  timestamp: number;
}

class ReverseGeocodingService {
  private cache = new Map<string, CachedAddress>();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  private requestDelay = 1000; // 1 second delay between requests to respect Nominatim rate limits
  private lastRequestTime = 0;
  private requestQueue: Array<{
    lat: number;
    lon: number;
    resolve: (address: string | null) => void;
  }> = [];
  private isProcessingQueue = false;

  // Get address from coordinates using OpenStreetMap Nominatim API
  async getAddressFromCoords(lat: number, lon: number): Promise<string | null> {
    // Validate coordinates
    if (!this.isValidCoordinate(lat, lon)) {
      console.warn('Invalid coordinates provided to reverse geocoding:', { lat, lon });
      return null;
    }

    const cacheKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;
    const cached = this.cache.get(cacheKey);

    // Return cached result if still valid
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.address;
    }

    // Add to queue and process
    return new Promise((resolve) => {
      this.requestQueue.push({ lat, lon, resolve });
      this.processQueue();
    });
  }

  // Process the request queue with rate limiting
  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      
      // Respect rate limiting
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.requestDelay) {
        await this.sleep(this.requestDelay - timeSinceLastRequest);
      }

      try {
        const address = await this.fetchAddressFromAPI(request.lat, request.lon);
        request.resolve(address);
      } catch (error) {
        console.error('Error in reverse geocoding:', error);
        request.resolve(null);
      }

      this.lastRequestTime = Date.now();
    }

    this.isProcessingQueue = false;
  }

  // Fetch address from Nominatim API
  private async fetchAddressFromAPI(lat: number, lon: number): Promise<string | null> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Luna-IoT/1.0 (iot-system@luna.com)', // Required by Nominatim
          'Accept-Language': 'en', // Optional: specify language
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ReverseGeocodingResult = await response.json();
      
      // Format the address
      const formattedAddress = this.formatAddress(data);
      
      // Cache the result
      const cacheKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;
      this.cache.set(cacheKey, {
        address: formattedAddress,
        timestamp: Date.now()
      });

      return formattedAddress;
    } catch (error) {
      console.error('Error fetching address from Nominatim:', error);
      return null;
    }
  }

  // Format address from Nominatim response
  private formatAddress(data: ReverseGeocodingResult): string {
    if (!data.address) {
      return data.display_name || 'Unknown location';
    }

    const parts: string[] = [];
    
    // Add road/street if available
    if (data.address.road) {
      parts.push(data.address.road);
    }

    // Add suburb/neighborhood if available
    if (data.address.suburb) {
      parts.push(data.address.suburb);
    }

    // Add city
    if (data.address.city) {
      parts.push(data.address.city);
    }

    // Add state if available
    if (data.address.state) {
      parts.push(data.address.state);
    }

    // Add country if available
    if (data.address.country) {
      parts.push(data.address.country);
    }

    // If no specific parts found, use display_name
    if (parts.length === 0) {
      return data.display_name || 'Unknown location';
    }

    return parts.join(', ');
  }

  // Validate coordinates
  private isValidCoordinate(lat: number, lon: number): boolean {
    return !isNaN(lat) && !isNaN(lon) &&
           lat >= -90 && lat <= 90 &&
           lon >= -180 && lon <= 180 &&
           lat !== 0 && lon !== 0; // Exclude null island
  }

  // Sleep utility for rate limiting
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clear expired cache entries
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getCacheStats(): { size: number; expiry: number } {
    return {
      size: this.cache.size,
      expiry: this.cacheExpiry
    };
  }

  // Batch reverse geocoding for multiple coordinates
  async batchReverseGeocode(coordinates: Array<{ lat: number; lon: number; id: string }>): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
    // Process in chunks to avoid overwhelming the API
    const chunkSize = 5;
    for (let i = 0; i < coordinates.length; i += chunkSize) {
      const chunk = coordinates.slice(i, i + chunkSize);
      
      const promises = chunk.map(async (coord) => {
        const address = await this.getAddressFromCoords(coord.lat, coord.lon);
        results.set(coord.id, address);
      });

      await Promise.all(promises);
    }

    return results;
  }
}

// Create and export a singleton instance
export const reverseGeocodingService = new ReverseGeocodingService();

// Clear expired cache entries every hour
setInterval(() => {
  reverseGeocodingService.clearExpiredCache();
}, 60 * 60 * 1000); 