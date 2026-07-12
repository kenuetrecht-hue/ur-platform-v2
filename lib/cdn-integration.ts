/**
 * CDN Integration Service
 * Global content delivery network for video/audio/image files
 */

export interface CDNNode {
  id: string;
  region: string;
  location: string;
  lat: number;
  lng: number;
  capacity: number;
  currentLoad: number;
  healthy: boolean;
}

export interface CachedAsset {
  id: string;
  url: string;
  contentType: string;
  size: number;
  cacheNodes: string[]; // Node IDs where asset is cached
  ttl: number; // Time to live in seconds
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

export class CDNManager {
  private nodes: Map<string, CDNNode> = new Map();
  private assets: Map<string, CachedAsset> = new Map();
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    bandwidthUsed: 0,
  };

  /**
   * Add CDN node
   */
  addNode(node: CDNNode): void {
    this.nodes.set(node.id, node);
  }

  /**
   * Remove CDN node
   */
  removeNode(nodeId: string): boolean {
    return this.nodes.delete(nodeId);
  }

  /**
   * Cache asset on CDN
   */
  cacheAsset(asset: CachedAsset): void {
    this.assets.set(asset.id, asset);
  }

  /**
   * Get nearest CDN node for client
   */
  getNearestNode(clientLat: number, clientLng: number): CDNNode | null {
    const healthyNodes = Array.from(this.nodes.values()).filter(n => n.healthy);
    if (healthyNodes.length === 0) return null;

    return healthyNodes.reduce((nearest, node) => {
      const distance = Math.sqrt(
        Math.pow(node.lat - clientLat, 2) + Math.pow(node.lng - clientLng, 2)
      );
      const nearestDistance = Math.sqrt(
        Math.pow(nearest.lat - clientLat, 2) + Math.pow(nearest.lng - clientLng, 2)
      );
      return distance < nearestDistance ? node : nearest;
    });
  }

  /**
   * Get asset from CDN
   */
  getAsset(assetId: string, clientLat?: number, clientLng?: number): { asset: CachedAsset; node: CDNNode | null } | null {
    const asset = this.assets.get(assetId);
    if (!asset) {
      this.stats.cacheMisses++;
      this.stats.totalRequests++;
      return null;
    }

    this.stats.cacheHits++;
    this.stats.totalRequests++;
    asset.accessCount++;
    asset.lastAccessed = new Date();

    let node: CDNNode | null = null;
    if (clientLat !== undefined && clientLng !== undefined) {
      node = this.getNearestNode(clientLat, clientLng);
    }

    return { asset, node };
  }

  /**
   * Purge asset from CDN
   */
  purgeAsset(assetId: string): boolean {
    return this.assets.delete(assetId);
  }

  /**
   * Purge all assets
   */
  purgeAll(): number {
    const count = this.assets.size;
    this.assets.clear();
    return count;
  }

  /**
   * Prefetch asset to specific node
   */
  prefetchToNode(assetId: string, nodeId: string): boolean {
    const asset = this.assets.get(assetId);
    const node = this.nodes.get(nodeId);

    if (!asset || !node) return false;

    if (!asset.cacheNodes.includes(nodeId)) {
      asset.cacheNodes.push(nodeId);
      node.currentLoad += asset.size;
    }

    return true;
  }

  /**
   * Get CDN statistics
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0
      ? ((this.stats.cacheHits / this.stats.totalRequests) * 100).toFixed(2)
      : 0;

    const totalCachedSize = Array.from(this.assets.values()).reduce((sum, a) => sum + a.size, 0);
    const totalCapacity = Array.from(this.nodes.values()).reduce((sum, n) => sum + n.capacity, 0);
    const utilization = totalCapacity > 0 ? ((totalCachedSize / totalCapacity) * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      hitRate,
      totalNodes: this.nodes.size,
      healthyNodes: Array.from(this.nodes.values()).filter(n => n.healthy).length,
      cachedAssets: this.assets.size,
      totalCachedSize,
      totalCapacity,
      utilization,
    };
  }

  /**
   * Get node statistics
   */
  getNodeStats() {
    return Array.from(this.nodes.values()).map(node => ({
      id: node.id,
      region: node.region,
      utilization: ((node.currentLoad / node.capacity) * 100).toFixed(2),
      healthy: node.healthy,
    }));
  }

  /**
   * Monitor CDN health
   */
  async healthCheck(): Promise<void> {
    for (const node of this.nodes.values()) {
      // Simulate health check
      node.healthy = Math.random() > 0.1; // 90% healthy
    }
  }
}

/**
 * Origin Shield
 * Protects origin server from traffic spikes
 */
export class OriginShield {
  private shieldNodes: Map<string, { id: string; requests: number; bandwidth: number }> = new Map();
  private config = {
    maxRequestsPerSecond: 10000,
    maxBandwidthPerSecond: 1000000000, // 1GB/s
  };

  /**
   * Check if request should be allowed
   */
  canServeRequest(size: number): boolean {
    const totalRequests = Array.from(this.shieldNodes.values()).reduce((sum, n) => sum + n.requests, 0);
    const totalBandwidth = Array.from(this.shieldNodes.values()).reduce((sum, n) => sum + n.bandwidth, 0);

    return (
      totalRequests < this.config.maxRequestsPerSecond &&
      totalBandwidth + size < this.config.maxBandwidthPerSecond
    );
  }

  /**
   * Record request
   */
  recordRequest(nodeId: string, size: number): void {
    if (!this.shieldNodes.has(nodeId)) {
      this.shieldNodes.set(nodeId, { id: nodeId, requests: 0, bandwidth: 0 });
    }

    const node = this.shieldNodes.get(nodeId)!;
    node.requests++;
    node.bandwidth += size;
  }

  /**
   * Get shield statistics
   */
  getStats() {
    const totalRequests = Array.from(this.shieldNodes.values()).reduce((sum, n) => sum + n.requests, 0);
    const totalBandwidth = Array.from(this.shieldNodes.values()).reduce((sum, n) => sum + n.bandwidth, 0);

    return {
      totalRequests,
      totalBandwidth,
      avgRequestSize: totalRequests > 0 ? totalBandwidth / totalRequests : 0,
      nodes: Array.from(this.shieldNodes.values()),
    };
  }
}

/**
 * Video Streaming Optimizer
 * Optimizes video delivery for different network conditions
 */
export class VideoStreamingOptimizer {
  private bitrates = [
    { quality: '4K', bitrate: 25000, resolution: '3840x2160' },
    { quality: '1080p', bitrate: 8000, resolution: '1920x1080' },
    { quality: '720p', bitrate: 2500, resolution: '1280x720' },
    { quality: '480p', bitrate: 1000, resolution: '854x480' },
    { quality: '360p', bitrate: 500, resolution: '640x360' },
  ];

  /**
   * Get optimal bitrate for bandwidth
   */
  getOptimalBitrate(bandwidthKbps: number): { quality: string; bitrate: number; resolution: string } {
    for (const option of this.bitrates) {
      if (bandwidthKbps >= option.bitrate * 1.5) {
        return option;
      }
    }
    return this.bitrates[this.bitrates.length - 1]; // Lowest quality
  }

  /**
   * Generate HLS playlist
   */
  generateHLSPlaylist(videoId: string): string {
    const playlist = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n';
    let content = playlist;

    for (const bitrate of this.bitrates) {
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${bitrate.bitrate}000,RESOLUTION=${bitrate.resolution}\n`;
      content += `${videoId}-${bitrate.quality}.m3u8\n`;
    }

    return content;
  }

  /**
   * Estimate bandwidth from download speed
   */
  estimateBandwidth(downloadedBytes: number, timeSeconds: number): number {
    return (downloadedBytes * 8) / (timeSeconds * 1000); // Convert to Kbps
  }
}
