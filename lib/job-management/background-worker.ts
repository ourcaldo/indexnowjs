import { jobMonitor } from './job-monitor';
import { QuotaResetMonitor } from '../monitoring/quota-reset-monitor';
import { JobErrorHandler } from './JobErrorHandler';

export class BackgroundWorker {
  private static instance: BackgroundWorker;
  private isStarted = false;
  private quotaResetMonitor: QuotaResetMonitor;
  private statusLogInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.quotaResetMonitor = QuotaResetMonitor.getInstance();
  }

  static getInstance(): BackgroundWorker {
    if (!BackgroundWorker.instance) {
      BackgroundWorker.instance = new BackgroundWorker();
    }
    return BackgroundWorker.instance;
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    const jobId = `background-worker-start-${Date.now()}`;
    
    await JobErrorHandler.withJobErrorHandling(
      async () => {
        jobMonitor.start();
        this.quotaResetMonitor.start();
        
        this.isStarted = true;
        
        if (this.statusLogInterval) {
          clearInterval(this.statusLogInterval);
        }
        
        this.statusLogInterval = setInterval(() => {
          this.logStatus();
        }, 5 * 60 * 1000);
        
        return { started: true };
      },
      {
        jobId,
        jobType: 'background_worker_startup',
        jobName: 'Background Worker Startup',
        metadata: { operation: 'start' }
      }
    );
  }

  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    const jobId = `background-worker-stop-${Date.now()}`;
    
    await JobErrorHandler.withJobErrorHandling(
      async () => {
        jobMonitor.stop();
        this.quotaResetMonitor.stop();
        
        if (this.statusLogInterval) {
          clearInterval(this.statusLogInterval);
          this.statusLogInterval = null;
        }
        
        this.isStarted = false;
        return { stopped: true };
      },
      {
        jobId,
        jobType: 'background_worker_shutdown',
        jobName: 'Background Worker Shutdown',
        metadata: { operation: 'stop' }
      }
    );
  }

  getStatus(): {
    isStarted: boolean;
    jobMonitor: any;
    uptime?: number;
  } {
    return {
      isStarted: this.isStarted,
      jobMonitor: jobMonitor.getStatus(),
      uptime: this.isStarted ? process.uptime() : undefined
    };
  }

  private logStatus(): void {
    const status = this.getStatus();
    JobErrorHandler.logJobProgress(
      {
        jobId: `background-worker-status-${Date.now()}`,
        jobType: 'background_worker_status',
        jobName: 'Background Worker Status Check'
      },
      {
        processed: status.uptime || 0,
        total: status.uptime || 1,
        percentage: 100
      }
    );
  }
}

export const backgroundWorker = BackgroundWorker.getInstance();
