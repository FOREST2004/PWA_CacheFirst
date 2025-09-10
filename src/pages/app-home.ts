import { LitElement, css, html } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import { resolveRouterPath } from '../router';

import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';

import { styles } from '../styles/shared-styles';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  image?: string;
  timestamp: number;
  source: 'cache' | 'network';
}

interface FavoriteItem {
  id: string;
  menuItemId: string;
  name: string;
  notes?: string;
  timestamp: number;
}

@customElement('app-home')
export class AppHome extends LitElement {
  @property() message = 'Menu Quán Cà Phê';

  @state() private menuItems: MenuItem[] = [];
  @state() private favorites: FavoriteItem[] = [];
  @state() private isOnline = navigator.onLine;
  @state() private lastAction = '';
  @state() private selectedCategory = 'all';
  @state() private selectedItem: MenuItem | null = null;
  @state() private showModal = false;

  private readonly MENU_CACHE_KEY = 'cafe-menu-cache';
  private readonly FAVORITES_CACHE_KEY = 'cafe-favorites-cache';
  private readonly API_URL = 'https://jsonplaceholder.typicode.com/posts';
  private offlineCheckInterval: number | undefined;
  private consecutiveOfflineChecks = 0;
  private consecutiveOnlineChecks = 0;

  static styles = [
    styles,
    css`
      .demo-container {
        max-width: 1000px;
        margin: 0 auto;
        padding: 20px;
      }

      .status-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 15px;
        border-radius: 12px;
        background: var(--sl-color-neutral-100);
        box-shadow: 0 2px 8px rgba(140, 22, 22, 0.34);
      }

      .online {
        background: linear-gradient(135deg, #10b981, #059669);
        color: black;
      }

      .offline {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
      }

      .cafe-header {
        text-align: center;
        margin-bottom: 30px;
        padding: 20px;
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        color: white;
        border-radius: 16px;
      }

      .category-filters {
        display: flex;
        gap: 10px;
        margin-bottom: 25px;
        flex-wrap: wrap;
      }

      .menu-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }

      .menu-item {
        border-radius: 12px;
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
        border: none;
        cursor: pointer;
      }

      .menu-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }

      .menu-item.from-cache {
        border-left: 4px solid #2563eb;
      }

      .menu-item.from-network {
        border-left: 4px solid #10b981;
      }

      .menu-item.unavailable {
        opacity: 0.6;
        filter: grayscale(50%);
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 10px;
      }

      .item-title {
        font-size: 1.1em;
        font-weight: bold;
        margin: 0;
        color: #fbbf24;
      }

      .item-price {
        font-size: 1.2em;
        font-weight: bold;
        color: #059669;
      }

      .item-category {
        display: inline-block;
        padding: 4px 8px;
        background: var(--sl-color-neutral-200);
        color: var(--sl-color-neutral-700);
        border-radius: 6px;
        font-size: 0.8em;
        margin-bottom: 8px;
      }

      .item-description {
        color: var(--sl-color-neutral-600);
        margin-bottom: 15px;
        line-height: 1.4;
      }

      .item-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .source-badge {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.7em;
        font-weight: bold;
      }

      .cache-badge {
        background:rgb(73, 147, 245);
        color: #1d4ed8;
      }

      .network-badge {
        background: #dcfce7;
        color: #059669;
      }

      .favorites-section {
        margin-top: 40px;
      }

      .favorite-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background:rgb(89, 77, 172);
        border-radius: 8px;
        margin-bottom: 10px;
      }

      .offline-notice {
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: white;
        padding: 15px;
        border-radius: 12px;
        margin-bottom: 20px;
        text-align: center;
      }

      .action-buttons {
        display: flex;
        gap: 10px;
        margin-bottom: 30px;
        flex-wrap: wrap;
      }

      /* Modal Styles */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
      }

      .modal-content {
        background: var(--sl-color-neutral-0);
        border-radius: 16px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        position: relative;
        animation: modalSlideIn 0.3s ease-out;
      }

      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-50px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }

      .modal-title {
        font-size: 1.5em;
        font-weight: bold;
        color:rgb(0, 0, 0);
        margin: 0;
        flex: 1;
        margin-right: 15px;
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 1.5em;
        cursor: pointer;
        color: var(--sl-color-neutral-500);
        padding: 5px;
        border-radius: 50%;
        transition: all 0.2s;
      }

      .modal-close:hover {
        background: var(--sl-color-neutral-100);
        color: var(--sl-color-neutral-700);
      }

      .modal-price {
        font-size: 1.3em;
        font-weight: bold;
        color: #059669;
        margin-bottom: 15px;
      }

      .modal-category {
        display: inline-block;
        padding: 6px 12px;
        background: var(--sl-color-primary-100);
        color: var(--sl-color-primary-700);
        border-radius: 8px;
        font-size: 0.9em;
        margin-bottom: 15px;
      }

      .modal-description {
        color: var(--sl-color-neutral-600);
        line-height: 1.6;
        margin-bottom: 20px;
        font-size: 1.1em;
      }

      .modal-info {
        background: var(--sl-color-neutral-50);
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
      }

      .modal-info-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .modal-info-item:last-child {
        margin-bottom: 0;
      }

      .modal-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      @media (prefers-color-scheme: dark) {
        .status-bar {
          background: var(--sl-color-neutral-800);
        }
        
        .item-title {
          color: #fbbf24;
        }
        
        .item-category {
          background: var(--sl-color-neutral-700);
          color: var(--sl-color-neutral-200);
        }

        .modal-content {
          background: var(--sl-color-neutral-900);
        }

        .modal-title {
          color:rgb(0, 0, 0);
        }

        .modal-info {
          background: var(--sl-color-neutral-800);
        }
      }

      @media (max-width: 768px) {
        .menu-grid {
          grid-template-columns: 1fr;
        }
        
        .category-filters {
          justify-content: center;
        }

        .modal-content {
          width: 95%;
          padding: 20px;
        }

        .modal-actions {
          flex-direction: column;
        }
      }
    `
  ];

  connectedCallback() {
    super.connectedCallback();


  
  













    window.addEventListener('online', this.updateOnlineStatus);
    window.addEventListener('offline', this.updateOnlineStatus);

    // Handle shortcut navigation
    this.handleShortcutNavigation();

    // Chỉ check một lần khi khởi tạo, không check liên tục
    this.initialNetworkCheck();

    this.loadData();
  }

  private handleShortcutNavigation() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');


    if (category && ['coffee', 'tea', 'food', 'dessert'].includes(category)) {
      console.log('✅ Setting category to:', category);
      this.selectedCategory = category;
      this.lastAction = `Đã chuyển đến menu ${this.getCategoryLabel(category)}`;

      setTimeout(() => {
        const categoryFilters = this.shadowRoot?.querySelector('.category-filters');
        categoryFilters?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    } else {
      console.log('❌ Category not valid or not found');
    }

    console.log('Selected category after:', this.selectedCategory);
    console.log('=== END DEBUG ===');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('online', this.updateOnlineStatus);
    window.removeEventListener('offline', this.updateOnlineStatus);
  }

  private updateOnlineStatus = () => {
    this.isOnline = navigator.onLine;
    if (this.isOnline) {
      this.lastAction = 'Đã kết nối lại - cập nhật menu mới nhất';
    } else {
      this.lastAction = 'Đã mất kết nối - hiển thị menu đã lưu';
    }
  }

  // Chỉ check network một lần khi khởi tạo
  private async initialNetworkCheck() {
    if (!navigator.onLine) {
      this.isOnline = false;
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`https://httpbin.org/get?t=${Date.now()}`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        mode: 'cors',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);
      this.isOnline = response.ok;
    } catch (error) {
      this.isOnline = false;
    }
  }

  // Cache First Strategy cho menu
  private async loadData() {
    try {
      // 1. Load menu từ cache trước (luôn có)
      const cachedMenu = this.loadMenuFromCache();
      const cachedFavorites = this.loadFavoritesFromCache();

      if (cachedMenu.length > 0) {
        this.menuItems = cachedMenu;
        this.favorites = cachedFavorites;
        this.lastAction = `Đã tải ${cachedMenu.length} món từ bộ nhớ`;
      }

      // 2. Nếu online, cập nhật từ server
      const isReallyOnline = await this.checkRealNetworkStatus();

      if (isReallyOnline) {
        try {
          const networkMenu = await this.loadMenuFromNetwork();
          // Trong hàm loadData(), thay thế dòng 320:
          if (networkMenu.length > 0) {
            // Lấy tất cả món từ cache
            const cacheItems = cachedMenu.filter(item => item.source === 'cache');

            // Lấy các món network chưa có trong cache
            const newNetworkItems = networkMenu.filter(networkItem =>
              !cacheItems.some(cacheItem => cacheItem.id === networkItem.id)
            );

            // Merge: ưu tiên cache, thêm network items mới
            this.menuItems = [...cacheItems, ...newNetworkItems];
            this.lastAction = `Đã cập nhật ${networkMenu.length} món từ server (${newNetworkItems.length} món mới)`;
          }
        } catch (networkError) {
          console.log('Network failed, using cache only:', networkError);
          this.isOnline = false;
          this.lastAction = 'Lỗi kết nối - hiển thị menu đã lưu';
        }
      } else {
        this.isOnline = false;
        this.lastAction = 'Chế độ offline - menu đã lưu trước đó';
      }

    } catch (error) {
      console.error('Error loading menu:', error);
      this.lastAction = 'Lỗi tải menu';
    }
  }

  // private async checkRealNetworkStatus(): Promise<boolean> {
  //   try {
  //     const controller = new AbortController();
  //     const timeoutId = setTimeout(() => controller.abort(), 3000);

  //     const response = await fetch(`https://httpbin.org/get?check=${Date.now()}`, {
  //       method: 'GET',
  //       signal: controller.signal,
  //       cache: 'no-store',
  //       mode: 'cors',
  //       headers: {
  //         'Cache-Control': 'no-cache',
  //         'Pragma': 'no-cache'
  //       }
  //     });

  //     clearTimeout(timeoutId);
  //     return response.ok;
  //   } catch (error) {
  //     return false;
  //   }
  // }
  private async checkRealNetworkStatus(): Promise<boolean> {
    // Kiểm tra navigator.onLine trước
    if (!navigator.onLine) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Tăng lên 5s

      // Thử nhiều endpoint khác nhau
      const endpoints = [
        'https://httpbin.org/get',
        'https://jsonplaceholder.typicode.com/posts/1',
        'https://www.google.com/favicon.ico'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${endpoint}?t=${Date.now()}`, {
            method: 'HEAD', // Nhanh hơn GET
            signal: controller.signal,
            cache: 'no-store',
            mode: 'cors'
          });

          clearTimeout(timeoutId);
          if (response.ok) return true;
        } catch (err) {
          continue; // Thử endpoint tiếp theo
        }
      }

      clearTimeout(timeoutId);
      return false;
    } catch (error) {
      return false;
    }
  }

  private loadMenuFromCache(): MenuItem[] {
    try {
      const cached = localStorage.getItem(this.MENU_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        return data.map((item: any) => ({
          ...item,
          source: 'cache' as const
        }));
      }
    } catch (error) {
      console.error('Error loading menu from cache:', error);
    }

    // Default offline menu nếu chưa có cache
    return this.getDefaultOfflineMenu();
  }



  private loadFavoritesFromCache(): FavoriteItem[] {
    try {
      const cached = localStorage.getItem(this.FAVORITES_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error loading favorites from cache:', error);
    }
    return [];
  }

  private handleSaveToCache(item: MenuItem) {
    try {
      // Lấy menu hiện tại từ cache
      const cachedMenu = this.loadMenuFromCache();

      // Kiểm tra xem món đã có trong cache chưa
      const existingItem = cachedMenu.find(cached => cached.id === item.id);

      if (!existingItem) {
        // Tạo bản sao của item với source là 'cache'
        const itemToCache: MenuItem = {
          ...item,
          source: 'cache',
          timestamp: Date.now()
        };

        // Thêm vào danh sách cache
        cachedMenu.push(itemToCache);

        // Lưu vào localStorage
        localStorage.setItem(this.MENU_CACHE_KEY, JSON.stringify(cachedMenu));

        // Cập nhật lại menu hiển thị
        this.loadData();

        this.lastAction = `Đã lưu "${item.name}" vào cache`;
      } else {
        this.lastAction = `"${item.name}" đã có trong cache`;
      }
    } catch (error) {
      console.error('Error saving item to cache:', error);
      this.lastAction = `Lỗi khi lưu "${item.name}"`;
    }
  }

  private handleRemoveFromCache(item: MenuItem) {
    try {
      // Lấy menu hiện tại từ cache
      const cachedMenu = this.loadMenuFromCache();

      // Lọc bỏ món cần xóa khỏi cache
      const updatedCache = cachedMenu.filter(cached => cached.id !== item.id);

      // Cập nhật localStorage
      localStorage.setItem(this.MENU_CACHE_KEY, JSON.stringify(updatedCache));

      // Cập nhật lại menu hiển thị
      this.loadData();

      this.lastAction = `Đã xóa "${item.name}" khỏi cache`;
    } catch (error) {
      console.error('Error removing item from cache:', error);
      this.lastAction = `Lỗi khi xóa "${item.name}" khỏi cache`;
    }
  }

  private handleItemClick(item: MenuItem) {
    this.selectedItem = item;
    this.showModal = true;
  }

  private handleCloseModal() {
    this.showModal = false;
    this.selectedItem = null;
  }

  private getDefaultOfflineMenu(): MenuItem[] {
    return [
      // {
      //   id: 'offline-1',
      //   name: 'Cà Phê Đen Đá',
      //   description: 'Cà phê phin truyền thống, đậm đà, thơm ngon',
      //   price: 25000,
      //   category: 'coffee',
      //   available: true,
      //   timestamp: Date.now(),
      //   source: 'cache'
      // },
      // {
      //   id: 'offline-2',
      //   name: 'Cà Phê Sữa',
      //   description: 'Cà phê phin pha với sữa đặc, ngọt ngào',
      //   price: 30000,
      //   category: 'coffee',
      //   available: true,
      //   timestamp: Date.now(),
      //   source: 'cache'
      // },
      // {
      //   id: 'offline-3',
      //   name: 'Bánh Mì Thịt Nướng',
      //   description: 'Bánh mì giòn với thịt nướng thơm lừng, ngon lắm á nha, thử đi',
      //   price: 35000,
      //   category: 'food',
      //   available: true,
      //   timestamp: Date.now(),
      //   source: 'cache'
      // }
    ];
  }

  private async loadMenuFromNetwork(): Promise<MenuItem[]> {

    const fixedMenu = [
      {
        id: 'network-1',
        name: 'Cà Phê Đen Đá',
        description: 'Cà phê phin truyền thống, đậm đà, thơm ngon',
        price: 25000,
        category: 'coffee',
        available: true,
        timestamp: Date.now(),
        source: 'network' as const
      },
      {
        id: 'network-2',
        name: 'Cà Phê Sữa',
        description: 'Cà phê phin pha với sữa đặc, ngọt ngào',
        price: 30000,
        category: 'coffee',
        available: true,
        timestamp: Date.now(),
        source: 'network' as const
      },
      {
        id: 'network-3',
        name: 'Bánh Mì Thịt Nướng',
        description: 'Bánh mì giòn với thịt nướng thơm lừng, ngon lắm á nha, thử đi',
        price: 35000,
        category: 'food',
        available: true,
        timestamp: Date.now(),
        source: 'network' as const
      },
      {
        id: 'network-4',
        name: 'Cappuccino Đặc Biệt',
        description: 'Cappuccino thơm ngon với bọt sữa mịn màng, hương vị cà phê đậm đà',
        price: 45000,
        category: 'coffee',
        available: true,
        timestamp: Date.now(),
        source: 'network' as const
      },
      {
        id: 'network-5',
        name: 'Trà Sữa Thái',
        description: 'Trà sữa Thái Lan đặc trưng với vị ngọt thanh mát, thêm trân châu dai',
        price: 35000,
        category: 'tea',
        available: true,
        timestamp: Date.now(),
        source: 'network' as const
      },
      {
        id: 'network-6',
        name: 'Bánh Tiramisu',
        description: 'Bánh Tiramisu Italy chính hiệu với mascarpone và cà phê espresso',
        price: 55000,
        category: 'dessert',
        available: true,
        timestamp: Date.now(),
        source: 'network' as const
      },
      {
        id: 'network-7',
        name: 'Sinh Tố Bơ',
        description: 'Sinh tố bơ tươi mát với sữa đặc, bổ dưỡng và thơm ngon',
        price: 30000,
        category: 'food',
        available: true,
        timestamp: Date.now(),
        source: 'network' as const
      },
      {
        id: 'network-8',
        name: 'Chè Đậu Đỏ',
        description: 'Chè đậu đỏ truyền thống với nước cốt dừa thơm béo',
        price: 25000,
        category: 'dessert',
        available: true,
        timestamp: Date.now(),
        source: 'network' as const
      },
      {
        id: 'network-9',
        name: 'Bánh Flan Caramel',
        description: 'Bánh flan caramel mềm mịn với lớp caramel đắng ngọt hài hòa',
        price: 40000,
        category: 'dessert',
        available: true,
        timestamp: Date.now(),
        source: 'network' as const
      }
    ];

    return fixedMenu;
  }

  private getVietnameseMenuName(index: number): string {
    const names = [
      'Cappuccino Đặc Biệt',
      'Trà Sữa Thái',
      'Bánh Tiramisu',
      'Sinh Tố Bơ',
      'Chè Đậu Đỏ',
      'Bánh Flan Caramel'
    ];
    return names[index % names.length];
  }

  private saveMenuToCache() {
    try {
      const cacheData = this.menuItems.filter(item => item.source === 'cache');
      localStorage.setItem(this.MENU_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving menu to cache:', error);
    }
  }

  private saveFavoritesToCache() {
    try {
      localStorage.setItem(this.FAVORITES_CACHE_KEY, JSON.stringify(this.favorites));
    } catch (error) {
      console.error('Error saving favorites to cache:', error);
    }
  }

  private handleAddToFavorites(item: MenuItem) {
    const favorite: FavoriteItem = {
      id: `fav-${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      timestamp: Date.now()
    };

    // Kiểm tra đã có trong favorites chưa
    if (!this.favorites.some(fav => fav.menuItemId === item.id)) {
      this.favorites = [favorite, ...this.favorites];
      this.saveFavoritesToCache();
      this.lastAction = `Đã thêm "${item.name}" vào yêu thích`;
    } else {
      this.lastAction = `"${item.name}" đã có trong danh sách yêu thích`;
    }
  }

  private handleRemoveFromFavorites(favoriteId: string) {
    this.favorites = this.favorites.filter(fav => fav.id !== favoriteId);
    this.saveFavoritesToCache();
    this.lastAction = 'Đã xóa khỏi yêu thích';
  }

  private async handleRefreshMenu() {
    this.lastAction = 'Đang làm mới menu...';

    // Chỉ check network khi user thực sự muốn refresh
    const isReallyOnline = navigator.onLine && await this.checkRealNetworkStatus();
    this.isOnline = isReallyOnline;

    await this.loadData();
  }

  private handleClearCache() {
    localStorage.removeItem(this.MENU_CACHE_KEY);
    this.menuItems = this.menuItems.filter(item => item.source === 'network');
    this.lastAction = 'Đã xóa menu đã lưu';
  }

  private filterMenuByCategory(category: string) {
    this.selectedCategory = category;
  }

  private get filteredMenu() {
    if (this.selectedCategory === 'all') {
      return this.menuItems;
    }
    return this.menuItems.filter(item => item.category === this.selectedCategory);
  }

  private formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }

  private getCategoryLabel(category: string): string {
    const labels = {
      'coffee': 'Cà phê',
      'tea': 'Trà',
      'food': 'Đồ ăn',
      'dessert': 'Tráng miệng'
    };
    return labels[category as keyof typeof labels] || category;
  }

  render() {
    return html`
      <app-header></app-header>

      <main>
        <div class="demo-container">
         

    
          
          <!-- Category Filters -->
          <div class="category-filters">
            <sl-button 
              variant="${this.selectedCategory === 'all' ? 'primary' : 'default'}"
              size="small"
              @click="${() => this.filterMenuByCategory('all')}"
            >
              Tất cả
            </sl-button>
            <sl-button 
              variant="${this.selectedCategory === 'coffee' ? 'primary' : 'default'}"
              size="small"
              @click="${() => this.filterMenuByCategory('coffee')}"
            >
              ☕ Cà phê
            </sl-button>
            <sl-button 
              variant="${this.selectedCategory === 'tea' ? 'primary' : 'default'}"
              size="small"
              @click="${() => this.filterMenuByCategory('tea')}"
            >
              🍵 Trà
            </sl-button>
            <sl-button 
              variant="${this.selectedCategory === 'food' ? 'primary' : 'default'}"
              size="small"
              @click="${() => this.filterMenuByCategory('food')}"
            >
              🍽️ Đồ ăn
            </sl-button>
            <sl-button 
              variant="${this.selectedCategory === 'dessert' ? 'primary' : 'default'}"
              size="small"
              @click="${() => this.filterMenuByCategory('dessert')}"
            >
              🍰 Tráng miệng
            </sl-button>
          </div>

          <!-- Menu Grid -->
          <div class="menu-grid">
            ${this.filteredMenu.map(item => html`
              <sl-card 
                class="menu-item ${item.source === 'cache' ? 'from-cache' : 'from-network'} ${!item.available ? 'unavailable' : ''}"
                @click="${() => this.handleItemClick(item)}"
              >
                <div class="item-header">
                  <h3 class="item-title">${item.name}</h3>
                  <div class="item-price">${this.formatPrice(item.price)}</div>
                </div>
                
                <div class="item-category">${this.getCategoryLabel(item.category)}</div>
                
                <p class="item-description">${item.description}</p>
                
                <div class="item-actions">
                  <sl-button 
                    size="small" 
                    variant="default"
                    @click="${(e: Event) => {
        e.stopPropagation();
        this.handleAddToFavorites(item);
      }}"
                  >
                    ❤️ Yêu thích
                  </sl-button>
                  
                  ${item.source === 'network' ? html`
                    <sl-button 
                      size="small" 
                      variant="primary"
                      @click="${(e: Event) => {
          e.stopPropagation();
          this.handleSaveToCache(item);
        }}"
                    >
                      💾 Lưu
                    </sl-button>
                  ` : html`
                    <sl-button 
                      size="small" 
                      variant="warning"
                      @click="${(e: Event) => {
          e.stopPropagation();
          this.handleRemoveFromCache(item);
        }}"
                    >
                      🗑️ Xóa cache
                    </sl-button>
                  `}
                  
                  <span class="source-badge ${item.source === 'cache' ? 'cache-badge' : 'network-badge'}">
                    ${item.source === 'cache' ? '💾' : '🌐'}
                  </span>
                </div>
              </sl-card>
            `)}
          </div>

          <!-- Favorites Section -->
          ${this.favorites.length > 0 ? html`
            <div class="favorites-section">
              <h2>❤️ Danh sách yêu thích (${this.favorites.length})</h2>
              ${this.favorites.map(favorite => html`
                <div class="favorite-item">
                  <div>
                    <strong>${favorite.name}</strong>
                    <small> - Đã thêm: ${new Date(favorite.timestamp).toLocaleString('vi-VN')}</small>
                  </div>
                  <sl-button 
                    size="small" 
                    variant="danger"
                    @click="${() => this.handleRemoveFromFavorites(favorite.id)}"
                  >
                    🗑️ Xóa
                  </sl-button>
                </div>
              `)}
            </div>
          ` : ''}
        </div>

        <!-- Modal Chi tiết món ăn -->
        ${this.showModal && this.selectedItem ? html`
          <div class="modal-overlay" @click="${this.handleCloseModal}">
            <div class="modal-content" @click="${(e: Event) => e.stopPropagation()}">
              <div class="modal-header">
                <h2 class="modal-title">${this.selectedItem.name}</h2>
                <button class="modal-close" @click="${this.handleCloseModal}">
                  ✕
                </button>
              </div>
              
              <div class="modal-price">${this.formatPrice(this.selectedItem.price)}</div>
              
              <div class="modal-category">
                ${this.getCategoryLabel(this.selectedItem.category)}
              </div>
              
              <div class="modal-description">
                ${this.selectedItem.description}
              </div>
              
              <div class="modal-info">
                <div class="modal-info-item">
                  <span><strong>Trạng thái:</strong></span>
                  <span>${this.selectedItem.available ? '✅ Có sẵn' : '❌ Hết hàng'}</span>
                </div>
                <div class="modal-info-item">
                  <span><strong>Nguồn dữ liệu:</strong></span>
                  <span>${this.selectedItem.source === 'cache' ? '💾 Đã lưu trữ' : '🌐 Từ server'}</span>
                </div>
                <div class="modal-info-item">
                  <span><strong>Cập nhật lúc:</strong></span>
                  <span>${new Date(this.selectedItem.timestamp).toLocaleString('vi-VN')}</span>
                </div>
              </div>
              
              <div class="modal-actions">
                <sl-button 
                  variant="default"
                  @click="${() => {
          this.handleAddToFavorites(this.selectedItem!);
        }}"
                >
                  ❤️ Thêm vào yêu thích
                </sl-button>
                
                ${this.selectedItem.source === 'network' ? html`
                  <sl-button 
                    variant="primary"
                    @click="${() => {
            this.handleSaveToCache(this.selectedItem!);
          }}"
                  >
                    💾 Lưu vào cache
                  </sl-button>
                ` : html`
                  <sl-button 
                    variant="warning"
                    @click="${() => {
            this.handleRemoveFromCache(this.selectedItem!);
            this.handleCloseModal();
          }}"
                  >
                    🗑️ Xóa khỏi cache
                  </sl-button>
                `}
                
                <sl-button 
                  variant="neutral"
                  @click="${this.handleCloseModal}"
                >
                  Đóng
                </sl-button>
              </div>
            </div>
          </div>
        ` : ''}
      </main>
    `;
  }
}
