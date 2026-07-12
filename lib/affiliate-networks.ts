/**
 * Affiliate Network Integration Service
 * Integrates with Amazon Associates, ShareASale, and CJ Affiliate
 */

export interface AffiliateNetwork {
  id: string;
  name: string;
  type: 'amazon' | 'shareasale' | 'cj';
  apiKey: string;
  apiSecret?: string;
  isActive: boolean;
  commission: number;
  categories: string[];
}

export interface AffiliateProduct {
  id: string;
  networkId: string;
  productId: string;
  productName: string;
  productUrl: string;
  affiliateUrl: string;
  category: string;
  price: number;
  commission: number;
  rating: number;
  reviews: number;
  imageUrl: string;
  description: string;
  inStock: boolean;
}

export interface AffiliateNetworkAccount {
  networkId: string;
  accountId: string;
  accountEmail: string;
  accountStatus: 'active' | 'pending' | 'suspended';
  joinDate: Date;
  totalEarnings: number;
  pendingPayment: number;
  lastPaymentDate?: Date;
}

export class AffiliateNetworksService {
  private networks: Map<string, AffiliateNetwork> = new Map();
  private products: Map<string, AffiliateProduct[]> = new Map();
  private accounts: Map<string, AffiliateNetworkAccount> = new Map();

  /**
   * Register affiliate network
   */
  registerNetwork(network: Omit<AffiliateNetwork, 'id'>): AffiliateNetwork {
    const newNetwork: AffiliateNetwork = {
      ...network,
      id: `net_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.networks.set(newNetwork.id, newNetwork);

    // Create account record
    this.accounts.set(newNetwork.id, {
      networkId: newNetwork.id,
      accountId: `acc_${newNetwork.type}_${Date.now()}`,
      accountEmail: 'admin@urplatform.com',
      accountStatus: 'active',
      joinDate: new Date(),
      totalEarnings: 0,
      pendingPayment: 0,
    });

    return newNetwork;
  }

  /**
   * Get network by ID
   */
  getNetwork(networkId: string): AffiliateNetwork | undefined {
    return this.networks.get(networkId);
  }

  /**
   * Get all networks
   */
  getAllNetworks(): AffiliateNetwork[] {
    return Array.from(this.networks.values());
  }

  /**
   * Get active networks
   */
  getActiveNetworks(): AffiliateNetwork[] {
    return Array.from(this.networks.values()).filter(n => n.isActive);
  }

  /**
   * Search products across networks
   */
  searchProducts(query: string, category?: string): AffiliateProduct[] {
    const results: AffiliateProduct[] = [];

    for (const products of this.products.values()) {
      const filtered = products.filter(p => {
        const matchesQuery = p.productName.toLowerCase().includes(query.toLowerCase()) ||
                           p.description.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = !category || p.category === category;
        return matchesQuery && matchesCategory;
      });
      results.push(...filtered);
    }

    return results.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get products by network
   */
  getNetworkProducts(networkId: string): AffiliateProduct[] {
    return this.products.get(networkId) || [];
  }

  /**
   * Get products by category
   */
  getProductsByCategory(category: string): AffiliateProduct[] {
    const results: AffiliateProduct[] = [];

    for (const products of this.products.values()) {
      const filtered = products.filter(p => p.category === category);
      results.push(...filtered);
    }

    return results;
  }

  /**
   * Add product to network
   */
  addProduct(networkId: string, product: Omit<AffiliateProduct, 'id' | 'networkId'>): AffiliateProduct {
    const newProduct: AffiliateProduct = {
      ...product,
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      networkId,
    };

    if (!this.products.has(networkId)) {
      this.products.set(networkId, []);
    }
    this.products.get(networkId)!.push(newProduct);

    return newProduct;
  }

  /**
   * Get top rated products
   */
  getTopRatedProducts(limit: number = 10): AffiliateProduct[] {
    const allProducts: AffiliateProduct[] = [];

    for (const products of this.products.values()) {
      allProducts.push(...products);
    }

    return allProducts
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  /**
   * Get best commission products
   */
  getBestCommissionProducts(limit: number = 10): AffiliateProduct[] {
    const allProducts: AffiliateProduct[] = [];

    for (const products of this.products.values()) {
      allProducts.push(...products);
    }

    return allProducts
      .sort((a, b) => b.commission - a.commission)
      .slice(0, limit);
  }

  /**
   * Get network account info
   */
  getNetworkAccount(networkId: string): AffiliateNetworkAccount | undefined {
    return this.accounts.get(networkId);
  }

  /**
   * Update network earnings
   */
  updateNetworkEarnings(networkId: string, amount: number): void {
    const account = this.accounts.get(networkId);
    if (account) {
      account.totalEarnings += amount;
      account.pendingPayment += amount;
    }
  }

  /**
   * Process network payment
   */
  processNetworkPayment(networkId: string): void {
    const account = this.accounts.get(networkId);
    if (account && account.pendingPayment > 0) {
      account.lastPaymentDate = new Date();
      account.pendingPayment = 0;
    }
  }

  /**
   * Get total earnings across all networks
   */
  getTotalEarnings(): number {
    let total = 0;
    for (const account of this.accounts.values()) {
      total += account.totalEarnings;
    }
    return total;
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): {
    totalNetworks: number;
    activeNetworks: number;
    totalProducts: number;
    totalEarnings: number;
    pendingPayment: number;
  } {
    const totalNetworks = this.networks.size;
    const activeNetworks = Array.from(this.networks.values()).filter(n => n.isActive).length;
    let totalProducts = 0;
    let totalEarnings = 0;
    let pendingPayment = 0;

    for (const products of this.products.values()) {
      totalProducts += products.length;
    }

    for (const account of this.accounts.values()) {
      totalEarnings += account.totalEarnings;
      pendingPayment += account.pendingPayment;
    }

    return {
      totalNetworks,
      activeNetworks,
      totalProducts,
      totalEarnings,
      pendingPayment,
    };
  }

  /**
   * Verify affiliate link validity
   */
  verifyAffiliateLink(affiliateUrl: string): boolean {
    return affiliateUrl.includes('ref=') || 
           affiliateUrl.includes('affiliate') || 
           affiliateUrl.includes('tag=');
  }

  /**
   * Generate affiliate link for product
   */
  generateAffiliateLink(networkId: string, productId: string, customTag?: string): string {
    const network = this.networks.get(networkId);
    if (!network) return '';

    const tag = customTag || `ur_${network.type}_${Date.now()}`;

    switch (network.type) {
      case 'amazon':
        return `https://amazon.com/s?k=${productId}&tag=${tag}`;
      case 'shareasale':
        return `https://www.shareasale.com/r.cfm?b=${productId}&u=${tag}`;
      case 'cj':
        return `https://www.cj.com/products/${productId}?aid=${tag}`;
      default:
        return '';
    }
  }

  /**
   * Get network recommendations
   */
  getNetworkRecommendations(): {
    recommendation: string;
    reason: string;
    expectedIncrease: number;
  }[] {
    const stats = this.getNetworkStats();
    const recommendations: {
      recommendation: string;
      reason: string;
      expectedIncrease: number;
    }[] = [];

    if (stats.activeNetworks < 3) {
      recommendations.push({
        recommendation: 'Activate all affiliate networks',
        reason: `Currently using ${stats.activeNetworks} of 3 available networks`,
        expectedIncrease: 40,
      });
    }

    if (stats.totalProducts < 100) {
      recommendations.push({
        recommendation: 'Add more products to networks',
        reason: `Only ${stats.totalProducts} products available. More products = more revenue`,
        expectedIncrease: 50,
      });
    }

    if (stats.pendingPayment > 0) {
      recommendations.push({
        recommendation: 'Process pending payments',
        reason: `$${stats.pendingPayment.toFixed(2)} waiting to be processed`,
        expectedIncrease: 0,
      });
    }

    return recommendations;
  }
}

// Export singleton instance
export const affiliateNetworksService = new AffiliateNetworksService();
