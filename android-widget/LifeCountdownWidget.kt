package com.m888ai.lifecountdown.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.RemoteViews
import java.text.NumberFormat
import java.util.*
import kotlin.math.floor

class LifeCountdownWidget : AppWidgetProvider() {
    
    companion object {
        const val PREFS_NAME = "LifeCountdownPrefs"
        const val KEY_BIRTH_DATE = "birthDate"
        const val KEY_LIFE_EXPECTANCY = "lifeExpectancy"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val stats = calculateStats(prefs)
        
        // Small widget
        val viewsSmall = RemoteViews(context.packageName, R.layout.widget_small)
        viewsSmall.setTextViewText(R.id.days_left, NumberFormat.getInstance().format(stats.daysLeft))
        
        // Medium widget  
        val viewsMedium = RemoteViews(context.packageName, R.layout.widget_medium)
        viewsMedium.setTextViewText(R.id.days_left, NumberFormat.getInstance().format(stats.daysLeft))
        viewsMedium.setTextViewText(R.id.weeks_left, "${stats.weeksLeft} weeks")
        viewsMedium.setTextViewText(R.id.years_left, "${stats.yearsLeft} years")
        viewsMedium.setTextViewText(R.id.percent_lived, String.format("%.1f%% lived", stats.percentLived))
        
        // Large widget
        val viewsLarge = RemoteViews(context.packageName, R.layout.widget_large)
        viewsLarge.setTextViewText(R.id.days_left, NumberFormat.getInstance().format(stats.daysLeft))
        viewsLarge.setTextViewText(R.id.weeks_left, "${stats.weeksLeft}")
        viewsLarge.setTextViewText(R.id.months_left, "${stats.monthsLeft}")
        viewsLarge.setTextViewText(R.id.years_left, "${stats.yearsLeft}")
        viewsLarge.setTextViewText(R.id.percent_lived, String.format("%.2f%% complete", stats.percentLived))
        viewsLarge.setProgressBar(R.id.progress_bar, 100, stats.percentLived.toInt(), false)
        
        // Open app on click
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        viewsSmall.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
        viewsMedium.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
        viewsLarge.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
        
        appWidgetManager.updateAppWidget(appWidgetId, viewsSmall)
    }
    
    private fun calculateStats(prefs: SharedPreferences): LifeStats {
        val birthDateMs = prefs.getLong(KEY_BIRTH_DATE, 0)
        val lifeExpectancy = prefs.getInt(KEY_LIFE_EXPECTANCY, 80)
        
        if (birthDateMs == 0L) {
            return LifeStats(0, 0, 0, 0, 0.0)
        }
        
        val now = System.currentTimeMillis()
        val birthDate = Date(birthDateMs)
        
        val cal = Calendar.getInstance()
        cal.time = birthDate
        cal.add(Calendar.YEAR, lifeExpectancy)
        val deathDate = cal.time
        
        val msLeft = deathDate.time - now
        val msLived = now - birthDateMs
        val totalMs = deathDate.time - birthDateMs
        
        val daysLeft = floor(msLeft / (1000.0 * 60 * 60 * 24)).toInt()
        val weeksLeft = floor(daysLeft / 7.0).toInt()
        val monthsLeft = floor(daysLeft / 30.44).toInt()
        val yearsLeft = floor(daysLeft / 365.25).toInt()
        val percentLived = (msLived.toDouble() / totalMs) * 100
        
        return LifeStats(daysLeft, weeksLeft, monthsLeft, yearsLeft, percentLived)
    }
    
    data class LifeStats(
        val daysLeft: Int,
        val weeksLeft: Int,
        val monthsLeft: Int,
        val yearsLeft: Int,
        val percentLived: Double
    )
}
