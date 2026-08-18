import { connectDB } from "../lib/mongodb";
import mongoose from "mongoose";

async function migrateUserOrganizations() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Failed to connect to database");
    }

    const usersCollection = db.collection("users");

    // Find all users that either have legacy 'organization' field or missing/null 'organizations' field
    const cursor = usersCollection.find({
      $or: [
        { organization: { $exists: true } },
        { organizations: { $exists: false } },
        { organizations: null },
      ],
    });

    const usersToMigrate = await cursor.toArray();
    console.log(`Found ${usersToMigrate.length} user document(s) requiring migration or cleanup.`);

    let migratedCount = 0;

    for (const doc of usersToMigrate) {
      const oldOrg = doc.organization;
      let currentOrgs = Array.isArray(doc.organizations) ? doc.organizations : [];

      if (oldOrg) {
        const oldOrgStr = oldOrg.toString();
        const exists = currentOrgs.some((id: unknown) => String(id) === oldOrgStr);
        if (!exists) {
          currentOrgs = [...currentOrgs, oldOrg];
        }
      }

      await usersCollection.updateOne(
        { _id: doc._id },
        {
          $set: { organizations: currentOrgs },
          $unset: { organization: "" },
        }
      );

      console.log(
        `Migrated user '${doc.email}' (${doc._id}): organizations=[${currentOrgs.map((o: unknown) => String(o)).join(", ")}].`
      );
      migratedCount++;
    }

    console.log(`Migration complete. Processed ${migratedCount} user(s).`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateUserOrganizations();
