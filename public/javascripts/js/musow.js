
$(document).ready(function() {
	$('.list').each(function () {
        var letter = $('a', this).text().toUpperCase().charAt(0);
        if (!$(this).parent().find('[data-letter="'+ letter +'"]').length) {
            $(this).parent().append('<section data-letter="'+ letter+'" id="'+ letter+'" class="collapse"><h4></h4></section>');
        	$(this).parent().find($('.alphabet')).append('<span data-toggle="collapse" data-target="#'+ letter+'" aria-expanded="false" aria-controls="'+ letter+'" class="info_collapse glyphicon glyphicon-info-sign">'+ letter +'</span>');
        }
        $(this).parent().find('[data-letter="'+ letter +'"]').append(this);
    });

});

