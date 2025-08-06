#!/usr/bin/env node
/**
 * Test script to demonstrate how other services can check user online status
 * Run with: node test-online-status.js
 */

const API_BASE = "http://localhost:3005/api/notifications";

// Function to check if a specific user is online
async function checkUserOnline(userId) {
  try {
    const response = await fetch(`${API_BASE}/user/${userId}/online`);
    const data = await response.json();

    console.log(`\n📊 User ${userId} Status:`);
    console.log(`   Online: ${data.online ? "✅ Yes" : "❌ No"}`);
    console.log(`   Connections: ${data.connections}`);
    console.log(`   Checked at: ${data.timestamp}`);

    return data;
  } catch (error) {
    console.error(`❌ Error checking user ${userId}:`, error.message);
    return null;
  }
}

// Function to get all online users
async function getAllOnlineUsers() {
  try {
    const response = await fetch(`${API_BASE}/users/online`);
    const data = await response.json();

    console.log(`\n📊 All Online Users:`);
    console.log(`   Total Online: ${data.totalOnline}`);
    console.log(`   Checked at: ${data.timestamp}`);

    if (data.onlineUsers.length > 0) {
      console.log(`   Online Users:`);
      data.onlineUsers.forEach((user) => {
        console.log(
          `     - User ${user.userId}: ${user.connections} connection(s)`
        );
      });
    } else {
      console.log(`   No users currently online`);
    }

    return data;
  } catch (error) {
    console.error(`❌ Error getting online users:`, error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log("🔔 Testing Notification Service Online Status API");
  console.log("=".repeat(50));

  // Test 1: Check specific users
  console.log("\n🧪 Test 1: Checking specific users...");
  await checkUserOnline(1);
  await checkUserOnline(2);
  await checkUserOnline(999); // Non-existent user

  // Test 2: Get all online users
  console.log("\n🧪 Test 2: Getting all online users...");
  await getAllOnlineUsers();

  console.log("\n✅ Tests completed!");
  console.log("\n💡 How other services can use this:");
  console.log(
    "   - GET /api/notifications/user/{userId}/online - Check specific user"
  );
  console.log(
    "   - GET /api/notifications/users/online - Get all online users"
  );
  console.log("\n📝 Example usage in other services:");
  console.log(
    '   const response = await fetch("http://notification-service:3005/api/notifications/user/123/online");'
  );
  console.log("   const { online } = await response.json();");
  console.log(
    "   if (online) { /* User is connected to notification service */ }"
  );
}

// need to test notifications features
// Run the tests
runTests().catch(console.error);
