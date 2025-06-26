Next Steps 06-26-26 11:13 AM:
    1. When resizing the SVG, the chart labels not being deleted and re-drawn which ultimately yields stacking chart labels. We need to fix this.
    2. Currently, the Chart Title is (e.g. CD ATT vs Date) is in the same x-dimension as the Zoom Controls container. Let’s expand the vertical height of the chart div container such that the header for each chart div container will reside above any Zoom Controls.
    3. Move the Zoom Controls container down closer to the leftAxis but leave a small amount of margin ( 5~10 px)  between Zoom Controls container and the chart SVG.
    4. Where the Zoom Controls container was before, add a Tab Group Container with two tabs named “Timeline” & “Variability”. The Timeline Tab should be active by default with the Timeline chart displayed.
    5. Please add complete playwright tests for this and add to /frontend/spc-dashboard/zoom_controls_and_tabs/ directory.


Update 1:
    1. Zoom Controls container is now stacking above the chart SVG and is superimposed over the leftAxis. Please fix.
    2. Remove the 30px data margin implemented for markers and lines as a boundary from the top and bottom of the chart region. Leave the 30px margin in place on the left and right. 