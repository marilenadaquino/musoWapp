
$(document).ready(function() {

	// display the alphabet and group/sort by alphabetical letter
    $('.list').each(function () {
        var letter = $('a', this).text().toUpperCase().charAt(0);
        if (!$(this).parent().find('[data-letter="'+ letter +'"]').length) {
            $(this).parent().append('<section data-letter="'+ letter+'" id="'+ letter+'" class="collapse toBeWrapped"><h5 class="col-lg-12 count"></h5></section>');
        	$(this).parent().find($('.alphabet')).append('<span data-toggle="collapse" data-target="#'+ letter+'" aria-expanded="false" aria-controls="'+ letter+'" class="info_collapse" data-parent="#toc_resources">'+ letter +'</span>');
        }
        $(this).parent().find('[data-letter="'+ letter +'"]').append(this);
        
    });
    $('.toBeWrapped').wrapAll("<section class='accordion-group'></section>");

    // focus on click
    $('.resource_collapse').on('click', function (e) {
        $(e.currentTarget).parent('span').addClass('active');
    });

    // open dropdown on the basis of the URI
    var path = window.location.href.split("#").pop();

    $('.alphabet span').each(function () {
        var id= $(this).attr('id');
        if(path === id) {
            // highlight the tab
            $(this).addClass('active');
            var div = id.split(/[-]+/).pop();
            var dropId = id.replace(div, '').replace(/.$/,"")
            // change the title of the page
            // $('h1').html(dropId).replace(/[-]+/," ");
            // open the tab
            $('#'+dropId).collapse();
            
        };
    });

    // close other dropdowns when opening one
    var $myGroup = $('.accordion-group');
    $('.collapse').on('show.bs.collapse', function () {
        $('.resource_collapse').parent('span').removeClass('active');
        $('.info_collapse').removeClass('alphaActive');
        $myGroup.find('.collapse').collapse('hide');
        var id = $(this).attr('id');
        var dropLabel = $('.resource_collapse[data-target="#'+id+'"]');
        dropLabel.parent('span').addClass('active');
        // in browse by name the label of the tab is different
        var alphaLabel = $('.info_collapse[data-target="#'+id+'"]');
        alphaLabel.addClass('alphaActive');
    });


    
});

