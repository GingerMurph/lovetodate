

## Plan: Add Background Image to Home Page Hero

1. **Copy the uploaded image** to `src/assets/hero-bg.png`
2. **Update `src/pages/Index.tsx`** hero section to use the image as a full-bleed background with a dark overlay so text remains readable
   - Import the image
   - Add it as an `<img>` with `absolute inset-0 object-cover w-full h-full` behind the hero content
   - Adjust the gradient overlay to be darker for contrast against the black-and-white photo

