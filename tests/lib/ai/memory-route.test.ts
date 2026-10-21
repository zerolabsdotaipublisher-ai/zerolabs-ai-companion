import "server-only";

import { test, describe, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

// Mock global response for NextResponse
// We can test route handler logic here.
