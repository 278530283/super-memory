// src/lib/appwrite.ts
import { Account, Client, Functions, Storage, TablesDB } from 'appwrite';

// --- Configuration ---
// Consider moving these to environment variables (.env)
const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'YOUR_APPWRITE_ENDPOINT';
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || 'YOUR_PROJECT_ID';

// --- Appwrite Client Initialization ---
const client = new Client();

client
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

// --- Service Instances ---
const account = new Account(client);
const storage = new Storage(client);
const functions = new Functions(client);
const tablesDB = new TablesDB(client);

// --- Export ---
export { account, client, functions, storage, tablesDB };

