#!/usr/bin/env node
/**
 * Quick Test Script for Notification Service
 * Run with: node quick-test.js
 */

const API_BASE = "http://localhost:3005/api/notifications";

async function runQuickTest() {
  console.log("🔔 Running Quick Test for Notification Service");
  console.log("=".repeat(50));

  try {
    // Test 1: Health Check
    console.log("\n🧪 Test 1: Health Check");
    const healthResponse = await fetch("http://localhost:3005/health");
    const healthData = await healthResponse.json();
    console.log("✅ Health check:", healthData.message);

    // Test 2: Check online users (should be empty initially)
    console.log("\n🧪 Test 2: Check Online Users");
    const onlineResponse = await fetch(`${API_BASE}/users/online`);
    const onlineData = await onlineResponse.json();
    console.log(`✅ Online users: ${onlineData.totalOnline}`);

    // Test 3: Check specific user status
    console.log("\n🧪 Test 3: Check User 1 Status");
    const userResponse = await fetch(`${API_BASE}/user/1/online`);
    const userData = await userResponse.json();
    console.log(
      `✅ User 1 online: ${userData.online}, connections: ${userData.connections}`
    );

    // Test 4: Create a notification
    console.log("\n🧪 Test 4: Create Notification");
    const notificationResponse = await fetch(`${API_BASE}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: 1,
        type: "message",
        title: "Test Notification",
        content: "This is a test notification from quick-test.js",
      }),
    });

    if (notificationResponse.ok) {
      const notificationData = await notificationResponse.json();
      console.log("✅ Notification created:", notificationData.message);
    } else {
      console.log(
        "⚠️ Notification creation response:",
        await notificationResponse.text()
      );
    }

    // Test 5: Get user notifications
    console.log("\n🧪 Test 5: Get User Notifications");
    const notificationsResponse = await fetch(`${API_BASE}/`, {
      headers: { "x-user-id": "1" },
    });

    if (notificationsResponse.ok) {
      const notificationsData = await notificationsResponse.json();
      console.log(
        `✅ Found ${notificationsData.notifications.length} notifications for user 1`
      );
      console.log(
        `✅ Total notifications: ${notificationsData.pagination.total}`
      );
    } else {
      console.log(
        "⚠️ Get notifications response:",
        await notificationsResponse.text()
      );
    }

    // Test 6: Get unread count
    console.log("\n🧪 Test 6: Get Unread Count");
    const unreadResponse = await fetch(`${API_BASE}/unread-count`, {
      headers: { "x-user-id": "1" },
    });

    if (unreadResponse.ok) {
      const unreadData = await unreadResponse.json();
      console.log(`✅ Unread notifications for user 1: ${unreadData.count}`);
    } else {
      console.log("⚠️ Unread count response:", await unreadResponse.text());
    }

    console.log("\n🎉 Quick test completed successfully!");
    console.log("\n💡 To test real-time features:");
    console.log("   1. Run: node serve-test.js");
    console.log("   2. Open: http://localhost:8081");
    console.log("   3. Connect users and send messages");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("   - Make sure the service is running: npm start");
    console.log("   - Check if port 3005 is available");
    console.log("   - Verify database is set up: npx prisma db push");
  }
}

// Run the test
runQuickTest();
