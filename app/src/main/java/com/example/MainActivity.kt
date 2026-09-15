package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.AppScreen
import com.example.ui.WholesaleViewModel
import com.example.ui.components.PhotoViewer16x9
import com.example.ui.screens.AdminDashboardScreen
import com.example.ui.screens.CartScreen
import com.example.ui.screens.CategoryGalleryScreen
import com.example.ui.screens.HomeScreen
import com.example.ui.screens.StaffDispatchScreen
import com.example.ui.screens.SubCategoryFoldersScreen
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                WholesaleApp()
            }
        }
    }
}

@Composable
fun WholesaleApp(
    viewModel: WholesaleViewModel = viewModel()
) {
    val currentScreen by viewModel.currentScreen.collectAsStateWithLifecycle()
    val photos by viewModel.currentSubCategoryPhotos.collectAsStateWithLifecycle()
    val activePhotoIndex by viewModel.activePhotoIndex.collectAsStateWithLifecycle()
    val cartItems by viewModel.cartItems.collectAsStateWithLifecycle()
    val toastMessage by viewModel.toastMessage.collectAsStateWithLifecycle()

    val snackbarHostState = remember { SnackbarHostState() }

    // Toast/Snackbar notifications
    LaunchedEffect(toastMessage) {
        toastMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearToast()
        }
    }

    // Android Hardware / Gesture Back Navigation
    BackHandler(enabled = currentScreen != AppScreen.HOME) {
        when (currentScreen) {
            AppScreen.PHOTO_VIEWER -> viewModel.navigateTo(AppScreen.GALLERY_GRID)
            AppScreen.GALLERY_GRID -> viewModel.navigateTo(AppScreen.SUB_CATEGORIES)
            AppScreen.SUB_CATEGORIES,
            AppScreen.CART,
            AppScreen.STAFF_PORTAL,
            AppScreen.ADMIN_DASHBOARD -> viewModel.navigateTo(AppScreen.HOME)
            AppScreen.HOME -> { /* Exit handled by OS */ }
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        when (currentScreen) {
            AppScreen.HOME -> {
                HomeScreen(
                    viewModel = viewModel,
                    modifier = Modifier.padding(innerPadding)
                )
            }
            AppScreen.SUB_CATEGORIES -> {
                SubCategoryFoldersScreen(
                    viewModel = viewModel,
                    modifier = Modifier.padding(innerPadding)
                )
            }
            AppScreen.GALLERY_GRID -> {
                CategoryGalleryScreen(
                    viewModel = viewModel,
                    modifier = Modifier.padding(innerPadding)
                )
            }
            AppScreen.PHOTO_VIEWER -> {
                if (photos.isNotEmpty()) {
                    PhotoViewer16x9(
                        photos = photos,
                        initialIndex = activePhotoIndex,
                        cartItems = cartItems,
                        onOptionSelected = { photo, optionLetter, qty ->
                            viewModel.addToCart(photo, optionLetter, qty)
                        },
                        onIndexChanged = { newIdx ->
                            viewModel.openPhotoInViewer(newIdx)
                        },
                        onBack = { viewModel.navigateTo(AppScreen.GALLERY_GRID) },
                        onOpenCart = { viewModel.navigateTo(AppScreen.CART) },
                        modifier = Modifier.padding(innerPadding)
                    )
                } else {
                    viewModel.navigateTo(AppScreen.GALLERY_GRID)
                }
            }
            AppScreen.CART -> {
                CartScreen(
                    viewModel = viewModel,
                    modifier = Modifier.padding(innerPadding)
                )
            }
            AppScreen.STAFF_PORTAL -> {
                StaffDispatchScreen(
                    viewModel = viewModel,
                    modifier = Modifier.padding(innerPadding)
                )
            }
            AppScreen.ADMIN_DASHBOARD -> {
                AdminDashboardScreen(
                    viewModel = viewModel,
                    modifier = Modifier.padding(innerPadding)
                )
            }
        }
    }
}

