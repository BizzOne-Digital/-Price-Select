import 'server-only'
import mongoose, { type Schema } from 'mongoose'

const compile = <S extends Schema>(name: string, schema: S) => mongoose.model(name, schema)

/**
 * Register a model once, so dev hot reloads and warm serverless instances don't re-compile it.
 * The return type is inferred from the schema (raw, hydrated and subdocument types preserved).
 */
export function model<S extends Schema>(name: string, schema: S): ReturnType<typeof compile<S>> {
  return (mongoose.models[name] as ReturnType<typeof compile<S>> | undefined) ?? compile(name, schema)
}
