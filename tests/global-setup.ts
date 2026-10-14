import { MongoMemoryReplSet } from 'mongodb-memory-server'
import type { TestProject } from 'vitest/node'

// Transactions need a replica set; this starts a disposable single-node one for the test run.
// Test data never touches a real deployment: MONGODB_URI is overridden here for the workers.
let rs: MongoMemoryReplSet

export async function setup(project: TestProject) {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } })
  project.provide('mongoUri', rs.getUri())
}

export async function teardown() {
  await rs?.stop()
}

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string
  }
}
