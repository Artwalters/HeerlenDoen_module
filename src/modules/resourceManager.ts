// Resource management module for optimized loading and caching

export interface ResourceLoadOptions {
  maxSize?: number;
  quality?: number;
  timeout?: number;
}

/**
 * Centralized resource manager for images, models, and other assets
 */
export class ResourceManager {
  private static instance: ResourceManager;
  private imageCache = new WeakMap<string, HTMLImageElement>();
  private modelCache = new Map<string, any>();
  private textureCache = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();
  private failedResources = new Set<string>();
  
  // Performance tracking
  private loadTimes = new Map<string, number>();
  private loadCounts = new Map<string, number>();

  private constructor() {}

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  /**
   * Load and optimize an image with caching
   */
  async loadOptimizedImage(
    url: string, 
    options: ResourceLoadOptions = {}
  ): Promise<HTMLImageElement> {
    const { maxSize = 512, timeout = 10000 } = options;
    
    // Check failed resources first
    if (this.failedResources.has(url)) {
      throw new Error(`Resource previously failed to load: ${url}`);
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Check cache
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }

    // Create loading promise
    const loadPromise = this.loadImageWithOptimization(url, maxSize, timeout);
    this.loadingPromises.set(url, loadPromise);

    try {
      const result = await loadPromise;
      this.imageCache.set(url, result);
      this.trackLoadSuccess(url);
      return result;
    } catch (error) {
      this.failedResources.add(url);
      this.trackLoadError(url);
      throw error;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  /**
   * Load image with size optimization and timeout
   */
  private loadImageWithOptimization(
    url: string, 
    maxSize: number, 
    timeout: number
  ): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const timeoutId = setTimeout(() => {
        img.src = ''; // Cancel loading
        reject(new Error(`Image load timeout: ${url}`));
      }, timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        
        // Check if resizing is needed
        if (Math.max(img.width, img.height) > maxSize) {
          resolve(this.resizeImage(img, maxSize));
        } else {
          resolve(img);
        }
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * Resize image to fit within maxSize while maintaining aspect ratio
   */
  private resizeImage(img: HTMLImageElement, maxSize: number): HTMLImageElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Calculate new dimensions
    const scale = Math.min(maxSize / img.width, maxSize / img.height);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    
    // Draw resized image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Create new image from canvas
    const resizedImg = new Image();
    resizedImg.src = canvas.toDataURL('image/jpeg', 0.85);
    return resizedImg;
  }

  /**
   * Load 3D model with caching - FIXED for GLTF
   */
  async loadModel(url: string, loader: any): Promise<any> {
    // Check cache first
    if (this.modelCache.has(url)) {
      return this.modelCache.get(url)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return await this.loadingPromises.get(url)!;
    }

    // Create loading promise
    const loadPromise = new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf: any) => {
          // For GLTF, we want the whole gltf object, not just scene
          resolve(gltf);
        },
        undefined, // onProgress
        (error: any) => reject(error)
      );
    });

    this.loadingPromises.set(url, loadPromise);

    try {
      const model = await loadPromise;
      this.modelCache.set(url, model);
      this.trackLoadSuccess(url);
      return model; // Return original, don't clone GLTF
    } catch (error) {
      this.failedResources.add(url);
      this.trackLoadError(url);
      throw error;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  /**
   * Optimize 3D model for better performance
   */
  private optimizeModel(model: any): void {
    model.traverse((child: any) => {
      if (child.isMesh) {
        // Enable frustum culling
        child.frustumCulled = true;
        
        // Optimize materials
        if (child.material) {
          // Reduce material precision for better performance
          if (child.material.map) {
            child.material.map.generateMipmaps = false;
            child.material.map.minFilter = (window as any).THREE?.LinearFilter || 1006;
          }
        }
      }
    });
  }

  /**
   * Preload critical resources
   */
  async preloadResources(urls: string[]): Promise<void> {
    const batchSize = 3; // Load 3 resources at a time
    const batches: string[][] = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
      batches.push(urls.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const promises = batch.map(url => 
        this.loadOptimizedImage(url).catch(() => null) // Continue on error
      );
      await Promise.all(promises);
    }
  }

  /**
   * Clear cache and free memory
   */
  cleanup(): void {
    // Clear caches
    this.imageCache = new WeakMap();
    this.modelCache.clear();
    this.textureCache.clear();
    this.loadingPromises.clear();
    
    // Clear tracking
    this.loadTimes.clear();
    this.loadCounts.clear();
    this.failedResources.clear();
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    cachedImages: number;
    cachedModels: number;
    failedResources: number;
    averageLoadTime: number;
  } {
    const totalLoadTime = Array.from(this.loadTimes.values()).reduce((a, b) => a + b, 0);
    const totalLoads = this.loadTimes.size;
    
    return {
      cachedImages: this.imageCache ? -1 : 0, // WeakMap size not accessible
      cachedModels: this.modelCache.size,
      failedResources: this.failedResources.size,
      averageLoadTime: totalLoads > 0 ? totalLoadTime / totalLoads : 0
    };
  }

  /**
   * Track successful load
   */
  private trackLoadSuccess(url: string): void {
    const now = Date.now();
    this.loadTimes.set(url, now);
    this.loadCounts.set(url, (this.loadCounts.get(url) || 0) + 1);
  }

  /**
   * Track load error
   */
  private trackLoadError(url: string): void {
    // Error tracking could be extended here
  }
}

// Export singleton instance
export const resourceManager = ResourceManager.getInstance();