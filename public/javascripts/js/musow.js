
$(document).ready(function() {
	// sort by alphabetical letter
    $('.list').each(function () {
        var letter = $('a', this).text().toUpperCase().charAt(0);
        if (!$(this).parent().find('[data-letter="'+ letter +'"]').length) {
            $(this).parent().append('<section data-letter="'+ letter+'" id="'+ letter+'" class="collapse"><h4></h4></section>');
        	$(this).parent().find($('.alphabet')).append('<span data-toggle="collapse" data-target="#'+ letter+'" aria-expanded="false" aria-controls="'+ letter+'" class="info_collapse glyphicon glyphicon-info-sign">'+ letter +'</span>');
        }
        $(this).parent().find('[data-letter="'+ letter +'"]').append(this);
    });

    // add circles before resources
    $('.group').each(function () {
    	$(this).prepend('<i class="fa fa-circle" aria-hidden="true"></i>  ')
    });

    // close other dropdowns 
    var myGroup = $('#toc_resources');
	myGroup.on('show.bs.collapse','.collapse', function() {
    	myGroup.find('.collapse.in').collapse('hide');
	});

    // open dropdown on the base of the URI
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
            $('#'+dropId).show();
            $('#'+id).on('click', function(e) {
                e.preventDefault();
                $('#'+dropId).slideToggle();
                $(this).removeClass('active');
            })
        }
    })
});

