// // app/api/items/available-with-location/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { db } from '@/lib/db';
// import { items } from '@/lib/db/schema';
// import { eq, and, sql, isNotNull } from 'drizzle-orm';

// // Define the valid location values to match your schema
// type ValidLocation = "Storage 1" | "Storage 2" | "Storage 3";

// // Helper function to check if a string is a valid location
// function isValidLocation(location: string): location is ValidLocation {
//   return ['Storage 1', 'Storage 2', 'Storage 3'].includes(location);
// }

// export async function GET(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
    
//     if (!session) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { searchParams } = new URL(request.url);
//     const search = searchParams.get('search') || '';
//     const category = searchParams.get('category') || '';
//     const location = searchParams.get('location') || '';

//     // Build query conditions - only available items with assigned location
//     let conditions = [
//       eq(items.status, 'available'),
//       // Items must have a location assigned
//       isNotNull(items.location)
//     ];

//     // Add search condition if provided
//     if (search) {
//       conditions.push(
//         sql`${items.description} ILIKE ${`%${search}%`}`
//       );
//     }

//     // Add category filter if provided
//     if (category) {
//       conditions.push(eq(items.productCategory, category));
//     }

//     // Add location filter if provided - with type validation
//     if (location && isValidLocation(location)) {
//       conditions.push(eq(items.location, location));
//     }

//     // Query for available items with location
//     const availableItems = await db.select({
//       id: items.id,
//       productCode: items.productCode,
//       description: items.description,
//       brandCode: items.brandCode,
//       productDivision: items.productDivision,
//       productCategory: items.productCategory,
//       inventory: items.inventory,
//       period: items.period,
//       season: items.season,
//       unitOfMeasure: items.unitOfMeasure,
//       condition: items.condition,
//       conditionNotes: items.conditionNotes,
//       location: items.location,
//       status: items.status,
//     })
//     .from(items)
//     .where(and(...conditions));

//     return NextResponse.json(availableItems);
//   } catch (error) {
//     console.error('Error fetching available items:', error);
//     return NextResponse.json({ error: 'Failed to fetch available items' }, { status: 500 });
//   }
// }