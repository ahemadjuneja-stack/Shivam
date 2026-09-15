package com.example

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.example.data.model.CatalogPhoto
import com.example.ui.components.WholesalePhotoDisplay
import com.example.ui.theme.MyApplicationTheme
import com.github.takahirom.roborazzi.RobolectricDeviceQualifiers
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = RobolectricDeviceQualifiers.Pixel8, sdk = [36])
class GreetingScreenshotTest {

    @get:Rule val composeTestRule = createComposeRule()

    @Test
    fun wholesale_photo_display_screenshot() {
        val samplePhoto = CatalogPhoto(
            id = 1,
            categoryId = "imitation",
            subCategoryId = 1,
            subCategoryName = "Earrings",
            photoCode = "ER-101",
            imageUri = "sample_earrings",
            itemCount = 4,
            aAvailable = true,
            bAvailable = true,
            cAvailable = false,
            dAvailable = true
        )

        composeTestRule.setContent {
            MyApplicationTheme {
                WholesalePhotoDisplay(photo = samplePhoto)
            }
        }

        composeTestRule.onRoot().captureRoboImage(filePath = "src/test/screenshots/wholesale_catalog.png")
    }
}

