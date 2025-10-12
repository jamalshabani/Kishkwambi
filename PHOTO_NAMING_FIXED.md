# Photo Naming System - FIXED ✅

## 📋 **New Naming Convention:**

**Format:** `{TripSegment}_{PhotoType}_{Number}_{Timestamp}.jpg`

**Example:** `ST25-00123_ContainerPhoto_3_1728723456789.jpg`

---

## 🏷️ **Photo Types:**

### 1. **ContainerPhoto** (Numbers 1-5)
All container wall and inside photos use "ContainerPhoto" in filename:

| Photo | Filename Example | Database Location |
|-------|------------------|-------------------|
| Front Wall | `ST25-00123_ContainerPhoto_1_timestamp.jpg` | Front Wall |
| Right Wall | `ST25-00123_ContainerPhoto_2_timestamp.jpg` | Right Wall |
| Back Wall | `ST25-00123_ContainerPhoto_3_timestamp.jpg` | Back Wall |
| Left Wall | `ST25-00123_ContainerPhoto_4_timestamp.jpg` | Left Wall |
| Inside | `ST25-00123_ContainerPhoto_5_timestamp.jpg` | Inside |

### 2. **TrailerPhoto** (Number 1)
| Photo | Filename Example |
|-------|------------------|
| Trailer | `ST25-00123_TrailerPhoto_1_timestamp.jpg` |

### 3. **TruckPhoto** (Number 1)
| Photo | Filename Example |
|-------|------------------|
| Truck | `ST25-00123_TruckPhoto_1_timestamp.jpg` |

### 4. **DamagePhoto** (Numbers 1, 2, 3...)
| Photo | Filename Example | Database Location |
|-------|------------------|-------------------|
| Damage 1 | `ST25-00123_DamagePhoto_1_timestamp.jpg` | Front Wall |
| Damage 2 | `ST25-00123_DamagePhoto_2_timestamp.jpg` | Right Wall |
| Damage 3 | `ST25-00123_DamagePhoto_3_timestamp.jpg` | Back Wall |
| ... | ... | ... |

### 5. **DriverLicensePhoto** (Number 1)
| Photo | Filename Example |
|-------|------------------|
| Driver License | `ST25-00123_DriverLicensePhoto_1_timestamp.jpg` |

---

## 🔄 **How It Works:**

### Backend Logic (server.js lines 3137-3225):

```javascript
let containerPhotoCounter = 0; // Tracks ContainerPhoto sequence

for (let i = 0; i < photos.length; i++) {
    const originalPhotoType = photoTypesArray[i]; // From frontend
    
    // Normalize for filename
    if (originalPhotoType is ContainerPhoto, RightWallPhoto, BackWallPhoto, LeftSidePhoto, InsidePhoto) {
        filenamePhotoType = 'ContainerPhoto';
        containerPhotoCounter++;
        sequenceNumber = containerPhotoCounter; // 1, 2, 3, 4, 5
    } else {
        filenamePhotoType = originalPhotoType; // TruckPhoto, TrailerPhoto, etc.
        sequenceNumber = 1;
    }
    
    // Generate filename
    filename = generateFilename(tripSegment, filenamePhotoType, sequenceNumber, timestamp);
    // Result: ST25-00123_ContainerPhoto_3_1728723456789.jpg
}
```

---

## 📂 **Example Folder Structure in B2:**

```
simba-terminal-photos/
└── ST25-00123/
    ├── ST25-00123_ContainerPhoto_1_1728723456789.jpg  ← Front Wall
    ├── ST25-00123_TrailerPhoto_1_1728723456790.jpg
    ├── ST25-00123_ContainerPhoto_2_1728723456791.jpg  ← Right Wall
    ├── ST25-00123_ContainerPhoto_3_1728723456792.jpg  ← Back Wall
    ├── ST25-00123_TruckPhoto_1_1728723456793.jpg
    ├── ST25-00123_ContainerPhoto_4_1728723456794.jpg  ← Left Wall
    ├── ST25-00123_ContainerPhoto_5_1728723456795.jpg  ← Inside
    ├── ST25-00123_DriverLicensePhoto_1_1728723456796.jpg
    ├── ST25-00123_DamagePhoto_1_1728723457897.jpg
    ├── ST25-00123_DamagePhoto_2_1728723457898.jpg
    ├── ST25-00123_DamagePhoto_3_1728723457899.jpg
    └── ... (more damage photos)
```

---

## 🎯 **Key Points:**

1. **ContainerPhoto numbers 1-5** represent the 5 walls/inside photos in order
2. **Filename uses normalized type** (ContainerPhoto for all walls)
3. **Database stores actual location** (Front Wall, Right Wall, etc.)
4. **Damage photos** all use "DamagePhoto" type with sequential numbers
5. **Truck and Trailer** keep their specific types

---

## ✅ **What's Fixed:**

### Camera Quality:
- ✅ All 13 files: quality 0.6
- ✅ Image picker: quality 0.6

### Photo Naming:
- ✅ Walls + Inside → ContainerPhoto (numbers 1-5)
- ✅ Damage → DamagePhoto (numbers 1, 2, 3...)
- ✅ Truck → TruckPhoto
- ✅ Trailer → TrailerPhoto

### Processing:
- ✅ Capture (0.6) → Crop → Resize (1920x1080) → Compress (0.6)
- ✅ Upload to B2 Cloud
- ✅ Complete logging at each step

---

## 📝 **Database vs Filename:**

**Filename:** `ST25-00123_ContainerPhoto_2_timestamp.jpg`  
**Database Record:**
```json
{
  "containerPhotoLocation": "Right Wall",
  "containerPhotoUrl": "https://...ST25-00123_ContainerPhoto_2_timestamp.jpg",
  "uploadedAt": "2025-10-12T..."
}
```

This way:
- ✅ Filenames are clean and consistent
- ✅ Database knows which wall it is
- ✅ Easy to understand sequence (1=Front, 2=Right, 3=Back, 4=Left, 5=Inside)

---

## 🎉 **Summary:**

**Naming format:** `{TripSegment}_{PhotoType}_{Number}_{Timestamp}.jpg`

**PhotoTypes:**
- ContainerPhoto (1-5): Front, Right, Back, Left, Inside walls
- TrailerPhoto (1): Trailer
- TruckPhoto (1): Truck
- DamagePhoto (1, 2, 3...): All damage photos
- DriverLicensePhoto (1): Driver's license

**All camera quality:** 0.6 ✅

**Ready to test!** 🚀

**Note:** Restart backend server for naming changes!

