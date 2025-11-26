import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export interface IUser extends Document {
  userId: string; // Unique identifier (session-based or authenticated user ID)
  metaUserId?: string; // Meta's user ID for verification
  userName?: string;
  email?: string;
  encryptedAccessToken: string; // Encrypted long-lived token (60 days)
  tokenExpiry: Date;
  tokenRefreshedAt?: Date; // Track when token was last refreshed
  pageId?: string;
  pageName?: string;
  igBusinessId?: string;
  igUsername?: string; // Instagram username if available
  permissions?: string[]; // Store granted permissions for audit
  
  // Multiple pages support
  pages?: Array<{
    pageId: string;
    pageName: string;
    encryptedPageToken: string; // Each page has its own token
    category?: string;
    tasks?: string[];
    igBusinessId?: string;
    igUsername?: string;
  }>;
  activePageId?: string; // Currently selected page for posting
  
  lastActivity?: Date; // Track user activity for cleanup
  isActive: boolean; // Flag for active/inactive users
  dataRetentionConsent?: Date; // GDPR compliance - when user consented
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual methods
  getDecryptedToken(): string;
  setEncryptedToken(token: string): void;
  getDecryptedPageToken(pageId: string): string;
  setEncryptedPageToken(pageId: string, token: string): void;
  getActivePage(): any;
  isTokenExpired(): boolean;
  needsTokenRefresh(): boolean;
}

export interface IUserModel extends Model<IUser> {
  cleanupExpiredTokens(): Promise<{ modifiedCount: number }>;
  cleanupInactiveUsers(daysInactive: number): Promise<{ deletedCount: number }>;
}

const UserSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    metaUserId: {
      type: String,
      sparse: true, // Allows null/undefined values while maintaining uniqueness
      index: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(email: string) {
          return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Invalid email format'
      }
    },
    encryptedAccessToken: {
      type: String,
      default: '', // Empty string for users without Meta tokens
      select: false, // Don't include in queries by default for security
    },
    tokenExpiry: {
      type: Date,
      required: true,
      index: true, // For efficient cleanup of expired tokens
    },
    tokenRefreshedAt: {
      type: Date,
      default: Date.now,
    },
    pageId: {
      type: String,
      index: true,
    },
    pageName: {
      type: String,
      trim: true,
    },
    igBusinessId: {
      type: String,
      index: true,
    },
    igUsername: {
      type: String,
      trim: true,
    },
    permissions: [{
      type: String,
      trim: true,
    }],
    
    // Multiple pages support
    pages: [{
      pageId: {
        type: String,
        required: true,
      },
      pageName: {
        type: String,
        required: true,
      },
      encryptedPageToken: {
        type: String,
        required: true,
        select: false, // Don't include by default for security
      },
      category: String,
      tasks: [String],
      igBusinessId: String,
      igUsername: String,
    }],
    activePageId: {
      type: String,
      index: true,
    },
    
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    dataRetentionConsent: {
      type: Date,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    // Add version key for optimistic concurrency control
    versionKey: '__v',
  }
);

// Encryption key - In production, use a proper key management system
const getEncryptionKey = (): Buffer => {
  const keyString = process.env.TOKEN_ENCRYPTION_KEY || 'default-fallback-key-32-chars-long';
  if (keyString.length !== 64) { // 64 hex chars = 32 bytes
    console.warn('TOKEN_ENCRYPTION_KEY should be 64 hex characters (32 bytes)');
  }
  // Convert hex string to buffer or pad/truncate to 32 bytes
  let keyBuffer: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(keyString)) {
    // Valid 64-character hex string
    keyBuffer = Buffer.from(keyString, 'hex');
  } else {
    // Fallback: hash the string to get consistent 32 bytes
    keyBuffer = crypto.createHash('sha256').update(keyString).digest();
  }
  return keyBuffer;
};
const ALGORITHM = 'aes-256-cbc';

// Instance methods for token encryption/decryption
UserSchema.methods.setEncryptedToken = function(token: string): void {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  this.encryptedAccessToken = iv.toString('hex') + ':' + encrypted;
};

UserSchema.methods.getDecryptedToken = function(): string {
  if (!this.encryptedAccessToken) {
    throw new Error('No encrypted token found');
  }
  
  const [ivHex, encryptedHex] = this.encryptedAccessToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

UserSchema.methods.isTokenExpired = function(): boolean {
  return new Date() > this.tokenExpiry;
};

UserSchema.methods.needsTokenRefresh = function(): boolean {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  return this.tokenExpiry < sevenDaysFromNow;
};

// Methods for page token management
UserSchema.methods.getDecryptedPageToken = function(pageId: string): string {
  const page = this.pages?.find((p: any) => p.pageId === pageId);
  if (!page || !page.encryptedPageToken) {
    throw new Error(`No encrypted token found for page ${pageId}`);
  }
  
  const [ivHex, encryptedHex] = page.encryptedPageToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

UserSchema.methods.setEncryptedPageToken = function(pageId: string, token: string): void {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const encryptedToken = iv.toString('hex') + ':' + encrypted;
  
  // Find and update the page's token
  const page = this.pages?.find((p: any) => p.pageId === pageId);
  if (page) {
    page.encryptedPageToken = encryptedToken;
  }
};

UserSchema.methods.getActivePage = function() {
  if (!this.activePageId || !this.pages || this.pages.length === 0) {
    return null;
  }
  return this.pages.find((p: any) => p.pageId === this.activePageId);
};

// Compound indexes for faster queries and cleanup
UserSchema.index({ tokenExpiry: 1, isActive: 1 }); // For cleanup of expired tokens
UserSchema.index({ lastActivity: 1, isActive: 1 }); // For inactive user cleanup
UserSchema.index({ createdAt: 1 }); // For data retention policies

// Pre-save middleware to update lastActivity
UserSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastActivity = new Date();
  }
  next();
});

// Static methods for cleanup and maintenance
UserSchema.statics.cleanupExpiredTokens = async function() {
  const now = new Date();
  return await this.updateMany(
    { tokenExpiry: { $lt: now }, isActive: true },
    { isActive: false, lastActivity: now }
  );
};

UserSchema.statics.cleanupInactiveUsers = async function(daysInactive = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
  
  return await this.deleteMany({
    lastActivity: { $lt: cutoffDate },
    isActive: false
  });
};

// Note: userId and metaUserId indexes are already defined in schema with index: true

// Delete the model from mongoose models if it already exists (for hot reloads)
if (mongoose.models.User) {
  delete mongoose.models.User;
}

const User: IUserModel = mongoose.model<IUser, IUserModel>('User', UserSchema);

export default User;
