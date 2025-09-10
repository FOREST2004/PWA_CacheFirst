import { LitElement, css, html } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import { resolveRouterPath } from '../router';

import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';

@customElement('app-header')
export class AppHeader extends LitElement {
  @property({ type: String }) title = 'Menu Quán Cà Phê.';
  @property({ type: Boolean}) enableBack: boolean = false;
  @state() private isOnline = navigator.onLine;

  static styles = css`
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 12px;
      padding-top: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);

      position: fixed;
      left: env(titlebar-area-x, 0);
      top: env(titlebar-area-y, 0);
      height: env(titlebar-area-height, 50px);
      width: env(titlebar-area-width, 100%);
      -webkit-app-region: drag;
      z-index: 1000;
    }

    header h1 {
      margin-top: 0;
      margin-bottom: 0;
      font-size: 16px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #back-button-block {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .status-section {
      display: flex;
      align-items: center;
      gap: 8px;
      -webkit-app-region: no-drag;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    .status-indicator.online {
      background-color: #10b981;
    }

    .status-indicator.offline {
      background-color: #ef4444;
    }

    @keyframes pulse {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
      100% {
        opacity: 1;
      }
    }

    .cache-info {
      font-size: 0.75em;
      opacity: 0.9;
    }

    sl-button::part(base) {
      -webkit-app-region: no-drag;
    }

    @media(prefers-color-scheme: light) {
      header {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
      }
    }

    @media(max-width: 768px) {
      header h1 {
        font-size: 14px;
      }
      
      .cache-info {
        display: none;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('online', this.updateOnlineStatus);
    window.addEventListener('offline', this.updateOnlineStatus);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('online', this.updateOnlineStatus);
    window.removeEventListener('offline', this.updateOnlineStatus);
  }

  private updateOnlineStatus = () => {
    this.isOnline = navigator.onLine;
  }

  // private getCacheInfo(): string {
  //   try {
  //     const cached = localStorage.getItem('cache-first-demo-data');
  //     if (cached) {
  //       const data = JSON.parse(cached);
  //       return `${data.length} cached`;
  //     }
  //   } catch (error) {
  //     console.error('Error reading cache info:', error);
  //   }
  //   return '0 cached';
  // }

  render() {
    return html`
      <header>
        <div id="back-button-block">
          ${this.enableBack ? html`<sl-button size="small" href="${resolveRouterPath()}">
            ← Back
          </sl-button>` : null}

          <h1>
            💾 ${this.title}
          
          </h1>
        </div>


      </header>
    `;
  }
}