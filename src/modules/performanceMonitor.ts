// Performance monitoring and adaptive optimization

import { eventBus, Events } from './eventBus.js';
import { stateManager } from './stateManager.js';

interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  loadTime: number;
  renderTime: number;
  networkLatency: number;
}

/**
 * Performance monitor with adaptive sampling
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private isMonitoring = false;
  private frameCount = 0;
  private lastFrameTime = 0;
  private renderTimes: number[] = [];
  private loadTimes: number[] = [];
  private networkTimes: number[] = [];
  
  // Adaptive sampling
  private sampleInterval = 1000; // Base interval: 1 second
  private maxSamples = 60; // Keep last 60 samples
  private lowPerformanceThreshold = 30; // FPS threshold
  
  // Performance thresholds
  private readonly thresholds = {
    frameRate: { good: 50, warning: 30, critical: 15 },
    memoryUsage: { good: 50, warning: 100, critical: 200 }, // MB
    renderTime: { good: 16, warning: 33, critical: 50 }, // ms
    loadTime: { good: 1000, warning: 3000, critical: 5000 }, // ms
  };

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.startFrameRateMonitoring();
    this.startMemoryMonitoring();
    this.setupEventListeners();
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    this.isMonitoring = false;
  }

  /**
   * Start monitoring frame rate
   */
  private startFrameRateMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFrameRate = (currentTime: number) => {
      if (!this.isMonitoring) return;
      
      frameCount++;
      const deltaTime = currentTime - lastTime;
      
      // Calculate FPS every second (adaptive)
      if (deltaTime >= this.sampleInterval) {
        const fps = Math.round((frameCount * 1000) / deltaTime);
        this.updateFrameRate(fps);
        
        frameCount = 0;
        lastTime = currentTime;
        
        // Adaptive sampling: reduce monitoring frequency on low performance
        if (fps < this.lowPerformanceThreshold) {
          this.sampleInterval = Math.min(this.sampleInterval * 1.5, 5000);
        } else {
          this.sampleInterval = Math.max(this.sampleInterval * 0.9, 1000);
        }
      }
      
      requestAnimationFrame(measureFrameRate);
    };
    
    requestAnimationFrame(measureFrameRate);
  }

  /**
   * Start monitoring memory usage
   */
  private startMemoryMonitoring(): void {
    const checkMemory = () => {
      if (!this.isMonitoring) return;
      
      let memoryUsage = 0;
      
      // Use performance.memory if available (Chrome)
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
      }
      
      this.updateMemoryUsage(memoryUsage);
      
      // Check memory every 5 seconds
      setTimeout(checkMemory, 5000);
    };
    
    checkMemory();
  }

  /**
   * Setup event listeners for tracking performance
   */
  private setupEventListeners(): void {
    // Track resource loading times
    eventBus.on(Events.RESOURCE_LOADED, (data) => {
      if (data?.loadTime) {
        this.trackLoadTime(data.loadTime);
      }
    });
    
    // Track network requests
    this.interceptNetworkRequests();
  }

  /**
   * Intercept network requests to measure latency
   */
  private interceptNetworkRequests(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const networkTime = endTime - startTime;
        
        this.trackNetworkTime(networkTime);
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const networkTime = endTime - startTime;
        this.trackNetworkTime(networkTime);
        throw error;
      }
    };
  }

  /**
   * Update frame rate and trigger optimizations if needed
   */
  private updateFrameRate(fps: number): void {
    const threshold = this.thresholds.frameRate;
    
    if (fps < threshold.critical) {
      this.triggerOptimization('critical', 'frameRate', fps);
    } else if (fps < threshold.warning) {
      this.triggerOptimization('warning', 'frameRate', fps);
    }
    
    // Update state manager
    const currentState = stateManager.getState();
    stateManager.updatePerformanceMetrics(fps, currentState.memoryUsage);
  }

  /**
   * Update memory usage and trigger optimizations if needed
   */
  private updateMemoryUsage(memoryMB: number): void {
    const threshold = this.thresholds.memoryUsage;
    
    if (memoryMB > threshold.critical) {
      this.triggerOptimization('critical', 'memory', memoryMB);
    } else if (memoryMB > threshold.warning) {
      this.triggerOptimization('warning', 'memory', memoryMB);
    }
    
    // Update state manager
    const currentState = stateManager.getState();
    stateManager.updatePerformanceMetrics(currentState.frameRate, memoryMB);
  }

  /**
   * Track load times
   */
  private trackLoadTime(loadTime: number): void {
    this.loadTimes.push(loadTime);
    if (this.loadTimes.length > this.maxSamples) {
      this.loadTimes.shift();
    }
    
    const threshold = this.thresholds.loadTime;
    if (loadTime > threshold.warning) {
      this.triggerOptimization('warning', 'loadTime', loadTime);
    }
  }

  /**
   * Track network times
   */
  private trackNetworkTime(networkTime: number): void {
    this.networkTimes.push(networkTime);
    if (this.networkTimes.length > this.maxSamples) {
      this.networkTimes.shift();
    }
  }

  /**
   * Trigger performance optimization
   */
  private triggerOptimization(level: 'warning' | 'critical', type: string, value: number): void {
    const optimizations = this.getOptimizationSuggestions(level, type, value);
    
    eventBus.emit(Events.PERFORMANCE_WARNING, {
      level,
      type,
      value,
      optimizations,
      timestamp: Date.now(),
    });
    
    // Auto-apply critical optimizations
    if (level === 'critical') {
      this.applyAutomaticOptimizations(type);
    }
  }

  /**
   * Get optimization suggestions based on performance issue
   */
  private getOptimizationSuggestions(level: string, type: string, value: number): string[] {
    const suggestions: string[] = [];
    
    switch (type) {
      case 'frameRate':
        suggestions.push('Reduce animation complexity');
        suggestions.push('Limit concurrent animations');
        suggestions.push('Use lower quality textures');
        if (level === 'critical') {
          suggestions.push('Disable 3D models temporarily');
        }
        break;
        
      case 'memory':
        suggestions.push('Clear unused resources');
        suggestions.push('Reduce image cache size');
        suggestions.push('Limit number of visible markers');
        if (level === 'critical') {
          suggestions.push('Force garbage collection');
        }
        break;
        
      case 'loadTime':
        suggestions.push('Implement resource preloading');
        suggestions.push('Use smaller image sizes');
        suggestions.push('Enable compression');
        break;
    }
    
    return suggestions;
  }

  /**
   * Apply automatic optimizations for critical performance issues
   */
  private applyAutomaticOptimizations(type: string): void {
    switch (type) {
      case 'frameRate':
        // Switch to low performance mode
        stateManager.setPerformanceMode('low');
        break;
        
      case 'memory':
        // Clear caches and force cleanup
        this.forceMemoryCleanup();
        break;
    }
  }

  /**
   * Force memory cleanup
   */
  private forceMemoryCleanup(): void {
    // Trigger garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    // Clear resource caches
    eventBus.emit('resource:cleanup');
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const avgLoadTime = this.loadTimes.length > 0 
      ? this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length 
      : 0;
      
    const avgRenderTime = this.renderTimes.length > 0
      ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
      : 0;
      
    const avgNetworkLatency = this.networkTimes.length > 0
      ? this.networkTimes.reduce((a, b) => a + b, 0) / this.networkTimes.length
      : 0;

    const currentState = stateManager.getState();
    
    return {
      frameRate: currentState.frameRate,
      memoryUsage: currentState.memoryUsage,
      loadTime: avgLoadTime,
      renderTime: avgRenderTime,
      networkLatency: avgNetworkLatency,
    };
  }

  /**
   * Clean up monitoring
   */
  cleanup(): void {
    this.stop();
    this.renderTimes.length = 0;
    this.loadTimes.length = 0;
    this.networkTimes.length = 0;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();