import { IndexStatus, UrlSubmission } from "../shared/schema";

// IndexNow specific storage interfaces
interface UrlIndexEntry {
  id: string;
  url: string;
  status: "pending" | "indexed" | "failed";
  submittedAt: string;
  indexedAt?: string;
  errorMessage?: string;
  userId: string;
}

interface InsertUrlIndex {
  url: string;
  userId: string;
}

// Storage interface for IndexNow operations
export interface IStorage {
  // URL indexing operations
  submitUrl(data: InsertUrlIndex): Promise<UrlIndexEntry>;
  getUrlStatus(id: string): Promise<UrlIndexEntry | undefined>;
  getUserUrls(userId: string): Promise<UrlIndexEntry[]>;
  updateUrlStatus(id: string, status: "pending" | "indexed" | "failed", errorMessage?: string): Promise<UrlIndexEntry>;
  
  // Analytics/stats
  getUserStats(userId: string): Promise<{
    totalSubmitted: number;
    indexed: number;
    pending: number;
    failed: number;
  }>;
}

export type { UrlIndexEntry, InsertUrlIndex };

export class MemStorage implements IStorage {
  private urlEntries: Map<string, UrlIndexEntry>;
  private currentId: number;

  constructor() {
    this.urlEntries = new Map();
    this.currentId = 1;
  }

  async submitUrl(data: InsertUrlIndex): Promise<UrlIndexEntry> {
    const id = (this.currentId++).toString();
    const entry: UrlIndexEntry = {
      id,
      url: data.url,
      status: "pending",
      submittedAt: new Date().toISOString(),
      userId: data.userId,
    };
    this.urlEntries.set(id, entry);
    return entry;
  }

  async getUrlStatus(id: string): Promise<UrlIndexEntry | undefined> {
    return this.urlEntries.get(id);
  }

  async getUserUrls(userId: string): Promise<UrlIndexEntry[]> {
    return Array.from(this.urlEntries.values()).filter(
      (entry) => entry.userId === userId
    );
  }

  async updateUrlStatus(
    id: string, 
    status: "pending" | "indexed" | "failed", 
    errorMessage?: string
  ): Promise<UrlIndexEntry> {
    const entry = this.urlEntries.get(id);
    if (!entry) {
      throw new Error("URL entry not found");
    }

    const updated: UrlIndexEntry = {
      ...entry,
      status,
      errorMessage,
      indexedAt: status === "indexed" ? new Date().toISOString() : entry.indexedAt,
    };
    
    this.urlEntries.set(id, updated);
    return updated;
  }

  async getUserStats(userId: string): Promise<{
    totalSubmitted: number;
    indexed: number;
    pending: number;
    failed: number;
  }> {
    const userUrls = await this.getUserUrls(userId);
    return {
      totalSubmitted: userUrls.length,
      indexed: userUrls.filter(u => u.status === "indexed").length,
      pending: userUrls.filter(u => u.status === "pending").length,
      failed: userUrls.filter(u => u.status === "failed").length,
    };
  }
}

export const storage = new MemStorage();
