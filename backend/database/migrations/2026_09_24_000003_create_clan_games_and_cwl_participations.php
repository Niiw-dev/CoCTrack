<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // --- Clan Games: Juegos del Clan (no API oficial, carga manual) ---
        Schema::create('clan_game_seasons', function (Blueprint $t) {
            $t->id();
            $t->timestampTz('start_time')->unique();
            $t->timestampTz('end_time')->nullable();
            $t->string('state')->nullable(); // preparation, inProgress, ended
            $t->integer('points_required')->default(4000); // mínimo para cumplir
            $t->integer('max_points')->default(4000);
            $t->integer('total_points')->default(0);
            $t->string('name')->nullable();
            $t->json('raw_json')->nullable();
            $t->timestampsTz();
        });

        Schema::create('clan_game_participations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('season_id')->constrained('clan_game_seasons')->cascadeOnDelete();
            $t->string('player_tag');
            $t->integer('points')->default(0);
            $t->integer('tasks_completed')->default(0);
            $t->boolean('cumplio')->default(false);
            $t->timestampsTz();
            $t->unique(['season_id', 'player_tag']);
            $t->index('player_tag');
        });

        // --- CWL participations: por guerra de liga (ataques reales) ---
        Schema::create('cwl_participations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('cwl_war_id')->constrained('cwl_wars')->cascadeOnDelete();
            $t->string('player_tag');
            $t->integer('attacks_done')->default(0);
            $t->integer('stars')->default(0);
            $t->float('destruction')->default(0);
            $t->timestampsTz();
            $t->unique(['cwl_war_id', 'player_tag']);
            $t->index('player_tag');
        });
    }

    public function down(): void {
        Schema::dropIfExists('cwl_participations');
        Schema::dropIfExists('clan_game_participations');
        Schema::dropIfExists('clan_game_seasons');
    }
};
